# Build shortlist browsing, picker, and sign-in continuation

Published issue: https://github.com/TakundaMuzunze/WhereNext/issues/28

## Problem Statement

Deliver the next ordered part of private named shortlists while preserving existing saves and the agreed learning process.

## Solution

Replace the flat Saved view with a shortlist overview and details. Add create/rename/delete with deletion confirmation. Adapt shared saved state and Save buttons to a membership picker with Save changes and cancellation; preserve failed choices and offer stale-list refresh. Resume the picker after guest sign-in and clear private state when sessions change.

## User Stories

1. As a traveller, I want this stage to preserve the agreed shortlist behaviour, so that I can organise destinations reliably.
2. As the project developer, I want changes delivered in dependency order, so that I can understand and verify each stage.

## Implementation Decisions

- Blocked by: #27.
- Preserve all agreed product behaviour.
- Follow the parent specification and existing architecture. No implementation starts from issue publication alone.

## Testing Decisions

- Extend existing browser journey tests and focused interaction coverage for first/later saves, multi-list selection, cancel/close, empty lists, counts, renaming/deletion, failed submission retry, sign-in continuation, sign-out privacy, and saved indicators.
- Assert external behaviour and persisted outcomes; reuse the existing browser and API boundaries where appropriate.

## Out of Scope

Work assigned to other delivery stages and all exclusions in the parent specification.

## Further Notes

Parent: #23. Published as a sub-issue in dependency order. Human learning checkpoints remain required even when ready-for-agent is applied.
