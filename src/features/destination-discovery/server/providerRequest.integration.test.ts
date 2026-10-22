/** @jest-environment node */
import { providerJson } from "./providerRequest";
import { prisma } from "@/shared/lib/db/prisma";
jest.mock("server-only", () => ({}), { virtual: true });
const originalFetch = global.fetch;
const upstream = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
let sequence = 0;
const url = () => new URL(`https://provider.example/test?case=${++sequence}`);
beforeAll(() => {
  const db = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.FLIGHT_TEST_DATABASE !== "disposable" || db.hostname !== "127.0.0.1" || db.pathname !== "/flight_test")
    throw new Error("Disposable database required");
});
beforeEach(async () => {
  await prisma.searchReservation.deleteMany();
  await prisma.searchAllowance.deleteMany({ where: { provider: { in: ["geoapify", "geonames", "travelpayouts"] } } });
  upstream.mockReset().mockResolvedValue(Response.json({ ok: true }));
  global.fetch = upstream;
});
afterAll(async () => {
  global.fetch = originalFetch;
  await prisma.$disconnect();
});
it("coalesces identical concurrent requests and charges only once", async () => {
  const target = url();
  await Promise.all(Array.from({ length: 8 }, () => providerJson("geoapify", target, 60)));
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(await prisma.searchAllowance.findUnique({ where: { provider: "geoapify" } })).toMatchObject({ used: 1 });
});
it("enforces a shared daily ceiling across different requests", async () => {
  await prisma.searchAllowance.create({ data: { provider: "geoapify", limit: 1, hourlyLimit: 100, expiresAt: new Date(Date.now() + 3600000) } });
  const results = await Promise.allSettled([providerJson("geoapify", url(), 60), providerJson("geoapify", url(), 60)]);
  expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
  expect(upstream).toHaveBeenCalledTimes(1);
});
it("does not refund failed upstream calls or immediately retry them", async () => {
  upstream.mockRejectedValue(new Error("down"));
  const target = url();
  await expect(providerJson("geoapify", target, 60)).rejects.toThrow();
  await expect(providerJson("geoapify", target, 60)).rejects.toThrow();
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(await prisma.searchAllowance.findUnique({ where: { provider: "geoapify" } })).toMatchObject({ used: 1 });
});
it("resets an expired daily budget while retaining operator limits", async () => {
  await prisma.searchAllowance.create({ data: { provider: "geoapify", limit: 7, used: 7, hourlyLimit: 10, expiresAt: new Date(0) } });
  await providerJson("geoapify", url(), 60);
  expect(await prisma.searchAllowance.findUnique({ where: { provider: "geoapify" } })).toMatchObject({ limit: 7, used: 1, hourlyLimit: 10 });
});
it("enforces the rolling hour independently of daily capacity", async () => {
  await prisma.searchAllowance.create({
    data: { provider: "geoapify", limit: 100, used: 1, hourlyLimit: 1, expiresAt: new Date(Date.now() + 3600000) },
  });
  await prisma.searchReservation.create({ data: { provider: "geoapify", requestKey: "prior", blockedUntil: new Date() } });
  await expect(providerJson("geoapify", url(), 60)).rejects.toThrow();
  expect(upstream).not.toHaveBeenCalled();
});
