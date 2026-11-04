/** @jest-environment node */
import { fetchDestinationImages } from "./fetchDestinationImages";

const fetchMock = jest.spyOn(globalThis, "fetch");

function responses() {
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        entities: {
          Q1000041: { id: "Q1000041", claims: { P18: [{ rank: "normal", mainsnak: { datavalue: { value: "Alcoutim.jpg" } } }] } },
        },
      }),
    ),
  );
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        query: {
          pages: {
            1: {
              title: "File:Alcoutim.jpg",
              imageinfo: [
                {
                  thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Alcoutim.jpg/1280px-Alcoutim.jpg",
                  descriptionurl: "https://commons.wikimedia.org/wiki/File:Alcoutim.jpg",
                  width: 4000,
                  height: 3000,
                  thumbwidth: 1280,
                  thumbheight: 960,
                  mime: "image/jpeg",
                  extmetadata: {
                    Artist: { value: '<a href="https://example.com">Jose &amp; Maria</a>' },
                    LicenseShortName: { value: "CC BY 2.0" },
                    LicenseUrl: { value: "https://creativecommons.org/licenses/by/2.0/" },
                    Restrictions: { value: "" },
                  },
                },
              ],
            },
          },
        },
      }),
    ),
  );
}

afterEach(() => fetchMock.mockReset());
afterAll(() => fetchMock.mockRestore());

it("enriches a destination by exact Wikidata identity with reusable photo and plain-text attribution", async () => {
  responses();
  const results = await fetchDestinationImages(["wikidata:Q1000041"], "WhereNext test");
  expect(results).toEqual([
    {
      destinationId: "wikidata:Q1000041",
      image: {
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Alcoutim.jpg/1280px-Alcoutim.jpg",
        fileTitle: "File:Alcoutim.jpg",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Alcoutim.jpg",
        author: "Jose & Maria",
        license: "CC BY 2.0",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
        attribution: "",
        width: 1280,
        height: 960,
      },
    },
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("ids")).toBe("Q1000041");
});

it("handles recorded Commons metadata, including public domain, ported licences and undersized photos", async () => {
  const wikidata = await import("../testing/wikidata.json");
  const commons = await import("../testing/commons.json");
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(wikidata)));
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(commons)));
  const results = await fetchDestinationImages(["wikidata:Q1000041", "wikidata:Q107338", "wikidata:Q11263", "wikidata:Q1157834"], "WhereNext test");
  expect(results[0].image).toMatchObject({ author: "Jose A.", license: "CC BY 2.0" });
  expect(results[1].image).toBeNull();
  expect(results[2].image).toMatchObject({ license: "CC BY-SA 3.0 es", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/es/deed.en" });
  expect(results[3].image).toMatchObject({ author: "Alberto Arias", license: "Public domain" });
});

it("does not search by ambiguous place names when a source-linked photo is absent", async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ entities: { Q1000041: { id: "Q1000041", claims: {} } } })));
  expect(await fetchDestinationImages(["wikidata:Q1000041"], "WhereNext test")).toEqual([{ destinationId: "wikidata:Q1000041", image: null }]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("rejects disagreement between the reported licence and licence link", async () => {
  const wikidata = await import("../testing/wikidata.json");
  const commons = await import("../testing/commons.json");
  const response = structuredClone(commons);
  response.query.pages["201499971"].imageinfo[0].extmetadata.LicenseUrl.value = "https://creativecommons.org/licenses/by-sa/4.0/";
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(wikidata)));
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(response)));
  expect((await fetchDestinationImages(["wikidata:Q1000041"], "WhereNext test"))[0].image).toBeNull();
});

it.each([
  { thumburl: "https://example.com/Alcoutim.jpg" },
  { thumburl: "https://upload.wikimedia.org.evil.test/wikipedia/commons/Alcoutim.jpg" },
  { mime: "image/svg+xml" },
  { width: 400, height: 300 },
])("leaves unsuitable image metadata unavailable: %j", async (changes) => {
  const wikidata = await import("../testing/wikidata.json");
  const commons = await import("../testing/commons.json");
  const response = structuredClone(commons);
  Object.assign(response.query.pages["201499971"].imageinfo[0], changes);
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(wikidata)));
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(response)));
  expect((await fetchDestinationImages(["wikidata:Q1000041"], "WhereNext test"))[0].image).toBeNull();
});

it("fails a source outage without returning a replacement batch", async () => {
  fetchMock.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
  await expect(fetchDestinationImages(["wikidata:Q1000041"], "WhereNext test")).rejects.toThrow("Existing images were retained");
});

it("rejects invalid identities and oversized batches before calling external services", async () => {
  await expect(fetchDestinationImages(["Alcoutim"], "WhereNext test")).rejects.toThrow();
  await expect(fetchDestinationImages(Array(26).fill("wikidata:Q1000041"), "WhereNext test")).rejects.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});
