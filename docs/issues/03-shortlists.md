# Create a shortlist with its first destination atomically - learning checkpoint

Published issue: https://github.com/TakundaMuzunze/WhereNext/issues/26

## Problem Statement

Deliver the next ordered part of private named shortlists while preserving existing saves and the agreed learning process.

## Solution

Implement an authenticated operation creating a valid named shortlist and its first valid destination membership in one transaction. Identity comes from the session. Duplicate-name, invalid-input, or failed-membership errors must leave no new shortlist behind.

## User Stories

1. As a traveller, I want this stage to preserve the agreed shortlist behaviour, so that I can organise destinations reliably.
2. As the project developer, I want changes delivered in dependency order, so that I can understand and verify each stage.

## Implementation Decisions

- Blocked by: #25.
- USER IMPLEMENTS; agent reviews validation, ownership, and failure handling.
- Follow the parent specification and existing architecture. No implementation starts from issue publication alone.

## Testing Decisions

- At the authenticated API boundary, verify successful persisted outcomes, unauthenticated rejection, invalid IDs/names, duplicate-name races, and complete rollback after a failed submission.
- Assert external behaviour and persisted outcomes; reuse the existing browser and API boundaries where appropriate.

## Out of Scope

Work assigned to other delivery stages and all exclusions in the parent specification.

## Further Notes

Parent: #23. Published as a sub-issue in dependency order. Human learning checkpoints remain required even when ready-for-agent is applied.
