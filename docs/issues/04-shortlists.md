# Implement shortlist management and membership changes

Published issue: https://github.com/TakundaMuzunze/WhereNext/issues/27

## Problem Statement

Deliver the next ordered part of private named shortlists while preserving existing saves and the agreed learning process.

## Solution

Implement owner-scoped reads, counts, empty-list creation, rename, delete, and transactional explicit membership additions/removals. Enforce all referenced ownership, reject stale shortlist references atomically, preserve other memberships, and derive saved state from any remaining membership. Define deterministic same-membership concurrency behaviour without conflict detection.

## User Stories

1. As a traveller, I want this stage to preserve the agreed shortlist behaviour, so that I can organise destinations reliably.
2. As the project developer, I want changes delivered in dependency order, so that I can understand and verify each stage.

## Implementation Decisions

- Blocked by: #26.
- Agent work may proceed only after earlier learning checkpoints are reviewed.
- Follow the parent specification and existing architecture. No implementation starts from issue publication alone.

## Testing Decisions

- Verify cross-user denial, duplicate constraints under concurrency, stale references without partial writes, unrelated-tab changes, delete isolation, and removal of the final membership through API responses and isolated database outcomes.
- Assert external behaviour and persisted outcomes; reuse the existing browser and API boundaries where appropriate.

## Out of Scope

Work assigned to other delivery stages and all exclusions in the parent specification.

## Further Notes

Parent: #23. Published as a sub-issue in dependency order. Human learning checkpoints remain required even when ready-for-agent is applied.
