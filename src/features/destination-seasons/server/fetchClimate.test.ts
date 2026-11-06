/** @jest-environment node */
import { fetchClimate } from "./fetchClimate";
import lisbon from "../testing/lisbon.json";
import chamonix from "../testing/chamonix.json";

const originalFetch = global.fetch;
const upstream = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

beforeEach(() => {
  upstream.mockReset().mockResolvedValue(Response.json(lisbon));
  global.fetch = upstream;
});

afterAll(() => {
  global.fetch = originalFetch;
});

it("retrieves the reviewed baseline at source grid resolution and preserves monthly mean units", async () => {
  const result = await fetchClimate(38.722, -9.139);

  expect(result).toMatchObject({ source: "nasa-power", baselineStart: 1991, baselineEnd: 2020, latitude: 38.5, longitude: -9.375 });
  expect(result.months).toHaveLength(12);
  expect(result.months[6]).toMatchObject({ month: 7, meanTemperatureC: lisbon.properties.parameter.T2M.JUL });
  const requestedUrl = new URL(String(upstream.mock.calls[0][0]));
  expect(requestedUrl.searchParams.get("start")).toBe("1991");
  expect(requestedUrl.searchParams.get("end")).toBe("2020");
  expect(requestedUrl.searchParams.get("latitude")).toBe("38.5");
});

it("preserves high regional elevation without presenting the result as town-level mountain conditions", async () => {
  upstream.mockResolvedValue(Response.json(chamonix));
  const result = await fetchClimate(45.9236, 6.8694);
  expect(result.elevationMetres).toBe(chamonix.geometry.coordinates[2]);
  expect(result.elevationMetres).toBeGreaterThan(1000);
});

it("translates fill values and missing months to unknown without treating them as cold or dry", async () => {
  const response = structuredClone(lisbon);
  response.properties.parameter.T2M.JUL = -999;
  upstream.mockResolvedValue(Response.json(response));
  expect((await fetchClimate(38.722, -9.139)).months[6].meanTemperatureC).toBeNull();
});

it("rejects a changed baseline rather than silently mixing periods", async () => {
  upstream.mockResolvedValue(Response.json({ ...lisbon, header: { ...lisbon.header, range: "January 2001 - December 2025" } }));
  await expect(fetchClimate(38.722, -9.139)).rejects.toThrow();
});

it("rejects failed responses and changed units", async () => {
  upstream.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
  await expect(fetchClimate(38.722, -9.139)).rejects.toThrow();
  upstream.mockResolvedValue(Response.json({ ...lisbon, parameters: { ...lisbon.parameters, T2M: { units: "F" } } }));
  await expect(fetchClimate(38.722, -9.139)).rejects.toThrow();
});

it("rejects a response for another location rather than attaching it to this destination", async () => {
  upstream.mockResolvedValue(Response.json({ ...lisbon, geometry: { coordinates: [0, 0, 0] } }));
  await expect(fetchClimate(38.722, -9.139)).rejects.toThrow("coordinates");
});
