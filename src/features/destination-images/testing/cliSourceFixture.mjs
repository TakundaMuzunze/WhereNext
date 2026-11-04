import { readFileSync } from "node:fs";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (process.env.CATALOGUE_TEST_DATABASE !== "disposable" || databaseUrl.hostname !== "127.0.0.1" || databaseUrl.pathname !== "/catalogue_test") {
  throw new Error("CLI HTTP fixture requires the disposable catalogue database.");
}

const commons = JSON.parse(readFileSync(new URL("./commons.json", import.meta.url), "utf8"));

globalThis.fetch = async (input) => {
  const url = new URL(String(input));

  if (url.hostname === "www.wikidata.org") {
    const ids = url.searchParams.get("ids").split("|");

    if (ids.includes(process.env.IMAGE_TEST_FAIL_ID)) {
      return new Response("Temporary source failure", { status: 503 });
    }

    const entities = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          id,
          claims: { P18: [{ rank: "normal", mainsnak: { datavalue: { value: "Alcoutim, Portugal (33090282632).jpg" } } }] },
        },
      ]),
    );

    return Response.json({ entities });
  }

  if (url.hostname === "commons.wikimedia.org") {
    return Response.json(commons);
  }

  throw new Error("Unexpected external request in CLI test.");
};
