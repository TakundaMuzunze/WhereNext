# Migrate existing saves into Saved places - learning checkpoint

Published issue: https://github.com/TakundaMuzunze/WhereNext/issues/25

## Problem Statement

Deliver the next ordered part of private named shortlists while preserving existing saves and the agreed learning process.

## Solution

Preserve every existing owner/destination save in one Saved places shortlist per owner with saves. Users without saves receive none. Plan compatible migration and application rollout; retain old storage until preservation and cutover are verified.

## User Stories

1. As a traveller, I want this stage to preserve the agreed shortlist behaviour, so that I can organise destinations reliably.
2. As the project developer, I want changes delivered in dependency order, so that I can understand and verify each stage.

## Implementation Decisions

- Blocked by: #24.
- USER IMPLEMENTS WITH GUIDANCE; review together before application.
- Follow the parent specification and existing architecture. No implementation starts from issue publication alone.

## Testing Decisions

- Exercise migration on representative isolated pre-migration data, including several users and no-save users. Compare owners and destination memberships before/after and verify account ownership and uniqueness.
- Assert external behaviour and persisted outcomes; reuse the existing browser and API boundaries where appropriate.

## Out of Scope

Work assigned to other delivery stages and all exclusions in the parent specification.

## Further Notes

Parent: #23. Published as a sub-issue in dependency order. Human learning checkpoints remain required even when ready-for-agent is applied.
