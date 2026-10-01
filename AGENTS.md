# WhereNext

WhereNext is a production-quality full-stack travel recommendation platform.

## Goals
- Build this as a serious portfolio project, not a tutorial project.
- Prioritise maintainable architecture and real-world engineering practices.
- Use the project to deepen my backend, database, system design and AI engineering skills.

## Working style
- Do not immediately implement major features.
- First inspect the existing codebase and explain the relevant architecture.
- Before significant implementation, propose an approach and explain trade-offs.
- Prefer existing project patterns over inventing new abstractions.
- Do not add dependencies without explaining why they are necessary.
- Avoid unnecessary abstractions and premature optimisation.

## Learning
When introducing something I have not used in this repository before:
1. Explain what problem it solves.
2. Explain how it works.
3. Explain why it is appropriate here.
4. Let me implement important learning-critical sections where practical.
5. Review my implementation afterwards.

Do not hide important architectural decisions inside generated code.

## TypeScript
- Use strict TypeScript.
- Avoid `any`.
- Validate external input.
- Prefer explicit domain types where useful.

## Verification
Before considering work complete:
- Run type checking.
- Run relevant tests.
- Review the git diff.
- Look for edge cases and regressions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
