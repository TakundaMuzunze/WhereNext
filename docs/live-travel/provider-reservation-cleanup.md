# Provider reservation cleanup

`SearchReservation` records enforce the rolling-hour request ceiling and an identical-request cooldown. Daily usage lives separately in `SearchAllowance.used`. Deleting a reservation must never refund a request, including one whose upstream call failed.

## Retention rule

The maintenance command only selects records for one explicitly named provider where both conditions hold:

- `createdAt` is strictly older than 24 hours according to the database clock.
- `blockedUntil` has expired according to the same clock.

Keeping 24 hours is a conservative operational policy, longer than the current one-hour counting window and one-minute duplicate cooldown. An unusually long active cooldown is retained regardless of record age. The command does not change allowances, destination evidence, images, users or shortlists. It supports `geoapify`, `geonames`, `travelpayouts` and the dormant `serpapi` records; cleaning records does not enable a provider.

## Preview and apply

The command reads `DATABASE_URL` using the existing environment setup. Confirm the intended environment before applying. Do not paste connection strings into logs or issue comments.

```bash
npm run providers:cleanup -- geoapify
npm run providers:cleanup -- geoapify --limit 1000 --apply
```

Preview is the default and uses a read-only transaction. `--apply` deletes one batch, defaulting to 1,000 records with a hard maximum of 5,000. Output includes the mode, provider, database check time, cutoff, batch limit, matched/deleted counts and `hasMore`. Counts describe this bounded batch, not the entire history. No reservation keys or connection details are printed.

Rerun the same apply command while `hasMore` is true. No cursor is required: completed deletions leave the next obsolete records eligible. Concurrent runs lock only their selected obsolete rows and skip already locked rows. A skipped row may leave `hasMore: true` with zero deletions; let the other transaction finish before retrying. Each run has one batch, a five-second statement timeout, a one-second lock timeout and a five-second connection timeout. It makes no provider requests.

A failed database batch rolls back and exits nonzero. Verify the error before retrying; do not increase provider allowance totals to compensate. The command uses the existing provider/date index and needs no schema migration.

## Operational status

Hosted operation verified on 9 November 2026: scheduled runs on 7–9 November succeeded using the configured maintenance connection. The [latest checked run](https://github.com/TakundaMuzunze/WhereNext/actions/runs/42612238458) applied all four provider checks with zero eligible rows and no backlog. A production read also found zero reservations. Disposable tests verify actual deletions and unchanged allowances; no artificial production deletion was needed. The implementation-time statements below describe what had not yet been run when the runner was introduced.

The single-provider command remains manual. `.github/workflows/provider-reservation-cleanup.yml` adds a daily scheduled run at 03:23 UTC and a manual Actions run that previews by default. The workflow only runs from `main`; it does not run on pull requests or pushes. Once merged and configured, scheduled runs apply cleanup automatically. No hosted workflow or production cleanup was run during implementation.

The scheduled runner processes Geoapify, GeoNames, Travelpayouts and dormant SerpApi records sequentially. Each provider gets at most ten batches of 1,000 records. It stops early when no eligible records remain. Preview only inspects one batch per provider. A database failure stops that provider while other providers are still checked. A remaining backlog after ten batches also makes the run fail, rather than silently reporting completion. Previously committed batches remain applied; rerunning requires no cursor.

Workflow concurrency allows only one cleanup run at a time and does not cancel an active run. Database row locking still protects against overlap with an operator running the manual command. The job has a ten-minute timeout and each child command has a thirty-second timeout. If a job is interrupted, inspect its logs and rerun; some earlier batches may have committed. Run logs and the Actions summary contain per-provider status, successful batch count, matched/deleted counts and a failure/backlog explanation, without reservation keys or database credentials.

## Configure and verify the scheduled job

1. Add the repository Actions secret `PROVIDER_MAINTENANCE_DATABASE_URL`, pointing to the intended application database. It is deliberately separate from CI's `DATABASE_URL`; verify the target rather than assuming the CI secret points to production. The connection needs to read and delete `SearchReservation`, but this job does not need API keys, authentication secrets or permission to edit allowance totals. Use a database role with only the required table access where available.
2. Merge the reviewed workflow into `main`. The daily schedule will then apply cleanup using that secret. For an initial preview before enabling deletion, merge without the secret, add it shortly before the manual check, and run the workflow with **apply unchecked**. A missing secret fails visibly without connecting to a database.
3. Review preview output, then optionally run manually with **apply checked**. Confirm the expected database target, counts and unchanged quota behaviour. The next daily schedule applies without needing this checkbox.
4. Enable the desired GitHub Actions failure notifications in your account/repository settings and monitor the initial runs. The workflow marks failures and adds an error annotation; email delivery depends on your notification preferences. Review backlog failures before changing batch limits.

GitHub schedules use UTC: 03:23 is 03:23 London time in winter and 04:23 during British Summer Time. Scheduled starts can be delayed or skipped by GitHub, and public repository schedules can be disabled after inactivity. Treat the schedule as best effort and review the latest successful run rather than assuming it executed. See [GitHub schedule behaviour](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) and [concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

Deployment-level rate protection and free-capacity verification remain follow-ups under #43; catalogue import scheduling remains #38.

Reservations are operational limit records, not a permanent audit log or billing history. If longer historical analysis is needed, agree a separate aggregate retention policy. Revisit this cleanup rule before introducing any rate-limit window longer than 24 hours or any new use of reservation history.

## Verification

`npm run test:flights:db` exercises the actual commands against disposable PostgreSQL alongside the existing provider guards. Tests cover read-only preview, bounded repeat runs, recent and future reservations, active cooldowns on old records, provider isolation, unchanged allowance totals, overlapping locks, invalid arguments and deletion rollback. Scheduled-runner tests cover preview across all providers, multi-batch apply, the hard backlog limit, partial provider failure and the Actions summary. No external provider calls are made. Actual GitHub scheduling, secret configuration and notification delivery still need hosted verification after merge.
