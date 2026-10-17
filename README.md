# WhereNext

WhereNext is a full-stack travel recommendation platform. It turns a traveller’s preferences into ranked destination recommendations, explains each match, and lets signed-in users organise places into private, named shortlists.

The project combines a complete planning journey with backend work on authentication, relational data modelling, ownership checks and transactional updates. Recommendations use a curated local catalogue and explicit scoring rules rather than live travel inventory or AI-generated rankings.

**[View the live app](https://wherenext-app.netlify.app/)**

## Features

- Multi-step planner covering departure, travel month, duration, budget, travellers, trip type and activities
- Activity choices that adapt to the selected trip type
- Ranked recommendations with category-level score breakdowns and clear weak-match states
- Destination detail pages with suitability guidance, trip ideas and practical notes
- Google sign-in and account management
- Private shortlists with names, destination counts, browsing, renaming and deletion confirmation
- Destinations saved in multiple shortlists, with changes applied only after confirmation
- Picker cancellation without writes, failed-save retry and recovery when a shortlist has been deleted elsewhere
- Sign-in continuation that returns guests to the intended destination’s picker without saving automatically
- Planner answers preserved in URL search parameters for editing and navigation
- Responsive layouts and light/dark themes

## Tech stack

| Area                       | Technologies                                             |
| -------------------------- | -------------------------------------------------------- |
| Application                | Next.js App Router, React, strict TypeScript             |
| UI                         | Tailwind CSS, Lucide icons, Sonner notifications         |
| Authentication             | Better Auth with Google OAuth                            |
| Persistence                | PostgreSQL, Prisma ORM and the PostgreSQL driver adapter |
| Unit and interaction tests | Jest, Testing Library                                    |
| Browser tests              | Playwright                                               |
| Delivery                   | GitHub Actions, Netlify                                  |

## How recommendations work

Every destination is scored out of 100 using five weighted categories:

| Category     | Weight | What is compared                                                             |
| ------------ | -----: | ---------------------------------------------------------------------------- |
| Budget       |     25 | Total budget against estimated per-person cost multiplied by traveller count |
| Travel month |     20 | Selected month against the destination’s recommended months                  |
| Trip type    |     25 | Selected trip style against supported trip types                             |
| Activities   |     20 | Proportion of selected activities offered by the destination                 |
| Duration     |     10 | Trip length against the recommended duration                                 |

Recommendations are sorted by score, with destination name used as a deterministic tie-breaker. The UI shows the category breakdown and reasons behind each result. The scoring rules live in `src/features/destination-matching`.

## How shortlists work

Each shortlist belongs to one user. A destination can appear once in each shortlist and belong to several shortlists. It counts as Saved whenever at least one membership exists.

The membership picker keeps checkbox selections and a new shortlist name as a draft until **Save changes**. Creating a shortlist inside the picker and changing memberships happen in one database transaction. Cancel or close discards the draft. Removing the final membership makes a destination unsaved while keeping the empty shortlist available to reuse.

The server derives identity from the session and checks ownership of referenced shortlists. Database constraints prevent duplicate memberships and case-insensitive duplicate names for the same owner. Explicit additions and removals preserve unrelated membership changes from other tabs. Private client state resets when the session changes.

The shortlist migration copies existing database saves into a **Saved places** shortlist for each owner who had saves. Users without existing saves receive no automatic shortlist. The legacy saved-destination table and endpoint are still present; the current frontend uses shortlists.

See the [shortlist specification](docs/shortlists.md) and [membership API documentation](docs/shortlist-memberships.md) for behaviour, transaction guarantees and concurrency rules.

## Architecture

The application follows a feature-oriented structure:

```text
src/
├── app/       # Pages, layouts and authenticated API routes
├── features/  # Planner, matching, authentication, shortlists and theme behaviour
├── entities/  # Domain types and entity-level UI
├── widgets/   # Page sections composed from features and entities
├── shared/    # Destination catalogue, authentication setup and database client
└── generated/ # Prisma client generated from the schema; not committed
prisma/
├── schema.prisma
└── migrations/
```

The planner validates and serialises answers into URL search parameters. Results and destination pages parse those answers and use the local catalogue to calculate recommendations.

Shortlist API routes use Better Auth sessions and Prisma to read and update PostgreSQL. The shortlist feature owns the browser API client, shared state and picker. Existing saved-destination buttons and navigation use that shared state to display consistent Saved indicators and counts.

## Getting started

### Requirements

- Node.js 22 or later and npm
- A PostgreSQL database
- Google OAuth client credentials for local sign-in
- Docker, with its daemon running, for the isolated database and migration tests

### Install dependencies

```bash
git clone https://github.com/TakundaMuzunze/WhereNext.git
cd WhereNext
npm ci
```

### Configure the environment

Create a `.env` file in the project root:

```dotenv
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/wherenext"
DIRECT_URL="postgresql://postgres:your-password@localhost:5432/wherenext"
BETTER_AUTH_SECRET="replace-with-a-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

`DATABASE_URL` is the runtime connection used by Prisma’s PostgreSQL adapter. `DIRECT_URL` is the connection used by the Prisma CLI for migrations. Both can point to the same database locally; a hosted setup may use separate pooled and direct connections.

Generate a random authentication secret with:

```bash
openssl rand -base64 32
```

For local Google sign-in, configure the OAuth client with the origin `http://localhost:3000` and redirect URI `http://localhost:3000/api/auth/callback/google`. Use the corresponding origin, authentication URL and callback URI for a deployed environment. Environment files are ignored by Git.

### Prepare the database and start the app

Create the database referenced by your connection URLs, then generate the Prisma client and apply the checked-in migrations:

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The destination catalogue is stored in the repository, so no destination-data seed is required.

## Available scripts

| Command                      | Purpose                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`                | Start the development server using webpack                                        |
| `npm run build`              | Generate the Prisma client and create a production build, including type checking |
| `npm run start`              | Serve an existing production build                                                |
| `npx tsc --noEmit`           | Check TypeScript without building                                                 |
| `npm run lint`               | Run ESLint                                                                        |
| `npm run format`             | Format the repository with Prettier                                               |
| `npm run format:check`       | Check formatting without changing files                                           |
| `npm test`                   | Run Jest unit and interaction tests                                               |
| `npm run test:watch`         | Run Jest in watch mode                                                            |
| `npm run test:coverage`      | Run Jest with coverage reporting                                                  |
| `npm run test:e2e`           | Build the app and run Playwright browser journeys                                 |
| `npm run test:shortlists:db` | Test shortlist API handlers against disposable PostgreSQL                         |
| `npm run test:migration`     | Verify shortlist migration preservation and constraints in disposable PostgreSQL  |

The build generates the Prisma client but does not apply database migrations. Apply migrations separately when preparing an environment.

## Testing and CI

Jest covers recommendation scoring, planner state, URL validation, authentication journeys, API validation and UI interactions. Database integration tests are excluded from the default Jest run and have their own command.

Install the Playwright browser before the first browser test run:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright starts a production server on port 3100. The browser journeys cover planning, editing answers, sign-in continuation, shortlist management, membership changes, cancellation, retry, session privacy and mobile layouts. Authentication and shortlist API responses are mocked in these journeys; they verify visible behaviour rather than database persistence or a real Google OAuth exchange.

Run the persistence checks separately with Docker running:

```bash
npm run test:shortlists:db
npm run test:migration
```

These scripts create and remove disposable PostgreSQL 17 containers. They verify ownership boundaries, constraints, transaction rollback, concurrency and migration preservation without using the application database.

GitHub Actions runs formatting, linting, Jest coverage, the production build and Playwright on pull requests targeting `main` and pushes to `main`. The Docker-backed database and migration checks are currently separate from that workflow. Coverage thresholds apply to the scoring, planner and theme modules configured in `jest.config.ts`.

## Current boundaries and future work

- Costs are broad planning estimates, not live quotes or itemised prices.
- Departure is retained with planner answers but does not affect ranking.
- Travel suitability uses a month rather than exact dates or live conditions.
- Destination content remains a curated local catalogue.
- Planner answers are carried in URLs; trips, itineraries and recommendation snapshots are not persisted.
- Shortlists are private; sharing, collaboration, notes and manual ordering are outside the current feature.
- AI-assisted recommendations and live travel integrations are possible future directions; the current matching system is rule-based.
