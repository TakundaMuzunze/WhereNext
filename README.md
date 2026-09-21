# WhereNext

WhereNext is a frontend travel-planning application that turns a short set of preferences into a ranked destination shortlist. Users can compare the reasons behind each match, explore destination-specific guidance and save places for later in their browser.

The MVP focuses on making a small, explainable recommendation system feel like a complete product journey. It uses curated local destination data rather than live travel inventory or pricing APIs.

**[View the live app](https://wherenext-app.netlify.app/)**

## Features

- Multi-step planner covering departure, travel month, duration, budget, travellers, trip type and activities
- Dynamic activity choices based on the selected trip type
- Ranked destination recommendations with explainable match-score breakdowns
- Honest weak-match states when no destination fits closely
- Destination detail pages with trip ideas, suitability guidance and practical notes
- Browser-based saved destinations that persist across refreshes
- Editable planner answers preserved through URL search parameters
- Responsive light and dark themes

## Tech stack

- [Next.js](https://nextjs.org/) App Router
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Jest](https://jestjs.io/) and [Testing Library](https://testing-library.com/) for unit and component tests
- [Playwright](https://playwright.dev/) for end-to-end tests
- [GitHub Actions](https://github.com/features/actions) for continuous integration
- [Netlify](https://www.netlify.com/) for deployment

## How matching works

Every destination is scored out of 100 using five weighted categories:

| Category     | Weight | What is compared                                                                                            |
| ------------ | -----: | ----------------------------------------------------------------------------------------------------------- |
| Budget       |     25 | The selected total budget against the destination's estimated per-person cost multiplied by traveller count |
| Travel month |     20 | The selected month against the destination's recommended months                                             |
| Trip type    |     25 | The selected trip style against the destination's supported trip types                                      |
| Activities   |     20 | The proportion of selected activities offered by the destination                                            |
| Duration     |     10 | The selected trip length against the destination's recommended duration                                     |

Recommendations are sorted by score, with destination name used as a deterministic tie-breaker. The UI exposes the category breakdown so users can see why a destination ranked where it did rather than relying on an unexplained percentage.

### Current limitations

- Costs are broad planning estimates, not live quotes or itemised prices.
- Departure is retained with the trip details but does not currently affect ranking.
- Travel suitability is based on a selected month rather than exact dates or live conditions.
- Destination content is a curated local dataset and is not supplied by a travel API.
- Saved destinations use `localStorage`, so they are limited to the current browser and device.

## Architecture

The application uses a lightweight [Feature-Sliced Design](https://feature-sliced.design/) structure inside `src`:

```text
src/
├── app/       # Next.js routes, layouts and global setup
├── features/  # User actions and focused business capabilities
├── entities/  # Domain models, types and entity-level UI
├── widgets/   # Larger page sections composed from features and entities
└── shared/    # Shared data and application-wide utilities
```

The planner serialises validated answers into URL search parameters. The results route parses those answers, passes them to the destination-matching feature and renders the ranked recommendations through widgets. Destination data and score types live with the destination entity, while saving and theme switching remain isolated user-facing features.

This keeps routing and page composition in `app`, reusable business behaviour in `features`, and domain definitions in `entities` without introducing layers that the current MVP does not need.

## Getting started

### Requirements

- Node.js 22 or later
- npm

### Installation

```bash
git clone https://github.com/TakundaMuzunze/WhereNext.git
cd WhereNext
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

No environment variables or external services are required for the current MVP.

## Available scripts

| Command                 | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev`           | Start the local development server                        |
| `npm run build`         | Create a production build and run Next.js type checking   |
| `npm run start`         | Serve the production build                                |
| `npm run lint`          | Run ESLint                                                |
| `npm run format`        | Format the repository with Prettier                       |
| `npm run format:check`  | Check formatting without changing files                   |
| `npm test`              | Run the Jest test suite                                   |
| `npm run test:watch`    | Run Jest in watch mode                                    |
| `npm run test:coverage` | Run Jest with coverage reporting                          |
| `npm run test:e2e`      | Build the application and run Playwright end-to-end tests |

## Testing and CI

The test suite covers the scoring rules, recommendation ordering, planner state, URL serialisation, saved-destination behaviour, themes and key UI components. Playwright verifies the main journey through planning, results, editing answers and saving destinations.

GitHub Actions runs the following checks on pull requests and pushes to `main`:

1. Formatting
2. Linting
3. Jest coverage
4. Production build
5. Playwright end-to-end tests

## Post-MVP ideas

- Departure-aware travel costs and live price integrations
- Exact-date and seasonal availability data
- Account-based, cross-device saved destinations
- Database-backed destination content and trip persistence
- Authentication and shareable trip plans
- More destinations and richer itinerary personalisation
