import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const argumentsList = process.argv.slice(2);
const apply = argumentsList.length === 1 && argumentsList[0] === "--apply";

if (argumentsList.length > 0 && !apply) {
  throw new Error("Usage: npm run providers:cleanup:scheduled -- [--apply]. Default: preview only.");
}

const mode = apply ? "apply" : "preview";
const providers = ["geoapify", "geonames", "travelpayouts", "serpapi"];
const batchLimit = 1000;
const maximumBatches = 10;
const commandPath = fileURLToPath(new URL("./cleanup-provider-reservations.mjs", import.meta.url));
const reports = [];

for (const provider of providers) {
  const report = { provider, matched: 0, deleted: 0, batches: 0, hasMore: false, status: "preview" };

  for (let batchNumber = 0; batchNumber < maximumBatches; batchNumber++) {
    const commandArguments = [commandPath, provider, "--limit", String(batchLimit)];

    if (apply) {
      commandArguments.push("--apply");
    }

    const result = spawnSync(process.execPath, commandArguments, { encoding: "utf8", timeout: 30000 });

    if (result.error || result.status !== 0) {
      report.status = "failed";
      console.error(`${provider}: cleanup batch failed. Earlier committed batches remain applied; retry after checking database access.`);
      break;
    }

    try {
      const batchSchema = z.object({
        mode: z.literal(mode),
        provider: z.literal(provider),
        limit: z.literal(batchLimit),
        matched: z.number().int().min(0).max(batchLimit),
        deleted: z.number().int().min(0).max(batchLimit),
        hasMore: z.boolean(),
      });
      const batch = batchSchema.parse(JSON.parse(result.stdout));

      report.matched += batch.matched;
      report.deleted += batch.deleted;
      report.batches++;
      report.hasMore = batch.hasMore;
    } catch {
      report.status = "failed";
      console.error(`${provider}: cleanup returned an invalid summary. A batch may have committed; inspect the database before retrying.`);
      break;
    }

    if (!apply) {
      break;
    }

    if (!report.hasMore) {
      report.status = "complete";
      break;
    }

    report.status = "backlog";
  }

  if (report.status === "backlog") {
    console.error(`${provider}: obsolete reservations remain after the bounded run. Review the backlog before rerunning.`);
  }

  reports.push(report);
}

const failed = reports.some((report) => report.status === "failed" || report.status === "backlog");
console.log(JSON.stringify({ mode, batchLimit, maximumBatches, failed, providers: reports }));

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = reports.map((report) => `| ${report.provider} | ${report.status} | ${report.batches} | ${report.matched} | ${report.deleted} |`);
  const summary = [
    `## Provider reservation cleanup (${mode})`,
    "",
    "| Provider | Status | Batches | Matched | Deleted |",
    "| --- | --- | ---: | ---: | ---: |",
    ...rows,
    "",
    "Retention: at least 24 hours and every active cooldown. Allowance totals are unchanged.",
    "Failed batches roll back; previously completed batches remain applied. Backlog or failure requires attention.",
    "",
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n"));
}

if (failed) {
  process.exitCode = 1;
}
