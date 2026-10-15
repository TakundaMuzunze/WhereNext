# Design shortlist models and database constraints - learning checkpoint

Published issue: https://github.com/TakundaMuzunze/WhereNext/issues/24

## Problem Statement

Deliver the next ordered part of private named shortlists while preserving existing saves and the agreed learning process.

## Solution

Introduce user-owned shortlists and destination memberships with explicit relationships, deletion behaviour, per-shortlist membership uniqueness, and per-owner case-insensitive name uniqueness. Review trimming, length enforcement, and exact normalisation. Keep the catalogue local and avoid a separate global save record.

## User Stories

1. As a traveller, I want this stage to preserve the agreed shortlist behaviour, so that I can organise destinations reliably.
2. As the project developer, I want changes delivered in dependency order, so that I can understand and verify each stage.

## Implementation Decisions

- First delivery stage; follow the agreed specification in #23.
- USER IMPLEMENTS; agent explains and reviews before any migration.
- Follow the parent specification and existing architecture. No implementation starts from issue publication alone.

## Testing Decisions

- Review model invariants and verify database-enforced uniqueness and relationship constraints against isolated Postgres data. Do not treat ORM mocks as proof.
- Assert external behaviour and persisted outcomes; reuse the existing browser and API boundaries where appropriate.

## Out of Scope

Work assigned to other delivery stages and all exclusions in the parent specification.

## Further Notes

Parent: #23. Published as a sub-issue in dependency order. Human learning checkpoints remain required even when ready-for-agent is applied.
