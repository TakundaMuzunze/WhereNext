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

This command is manual. No production deletion or automatic schedule was performed as part of implementation. For an initial rollout, review previews per provider and apply bounded batches during a quiet period. A future scheduled job should record exit status and the summary, alert on failures, and drain any backlog in bounded runs. Scheduling and deployment-level rate protection remain separate follow-ups under #43; catalogue import scheduling remains #38.

Reservations are operational limit records, not a permanent audit log or billing history. If longer historical analysis is needed, agree a separate aggregate retention policy. Revisit this cleanup rule before introducing any rate-limit window longer than 24 hours or any new use of reservation history.

## Verification

`npm run test:flights:db` exercises the actual command against disposable PostgreSQL alongside the existing provider guards. Tests cover read-only preview, bounded repeat runs, recent and future reservations, active cooldowns on old records, provider isolation, unchanged allowance totals, overlapping locks, invalid arguments and deletion rollback. No external provider calls are made.
