# WhereNext

A full-stack travel recommendation platform that helps users discover personalised destination matches based on their dates, budget, trip style and activity preferences.

WhereNext is designed as a product-led travel planner. Users answer a short multi-step questionnaire, receive ranked destination recommendations, and can explore why each destination fits their trip.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS

## Planned Stack

- PostgreSQL
- Prisma
- Clerk / Auth.js
- Playwright
- Vitest
- GitHub Actions
- Vercel

## Core MVP

- Multi-step trip planner
- Dynamic activity questions based on trip type
- Destination matching algorithm
- Ranked recommendation results
- Destination detail pages
- Saved trips dashboard

## Project Structure

The application uses a lightweight Feature-Sliced Design structure inside `src`:

```text
src/
├── app/       # Next.js routes, layouts, global styles and app-wide setup
├── features/  # User-facing actions and product functionality
├── entities/  # Business entities and their related UI, types and logic
├── widgets/   # Larger composed sections made from features and entities
└── shared/    # Reusable UI, utilities, configuration and common types
```
