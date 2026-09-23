# BookScavenger

Find physical books in nearby libraries. BookScavenger connects reader search with library catalog management and administrator verification through a Next.js frontend, an Express API, and Supabase PostgreSQL and authentication.

## Main workflows

- **Readers:** search by title, author, or ISBN; explore availability and map-based results.
- **Librarians:** complete onboarding and manage catalog uploads.
- **Administrators:** review libraries and manage platform workflows.

The search implementation includes distance-aware ranking, availability and popularity signals, a PostgreSQL fuzzy-search fallback, and optional Meilisearch integration. The repository also contains holds, reader alerts, and library-verification workflows.

## Architecture

```text
Next.js frontend -> Express REST API -> Supabase PostgreSQL
        |                    |
   Supabase Auth       Optional search and email services
```

| Directory | Purpose |
| --- | --- |
| [frontend/](frontend/README.md) | Next.js, React, TypeScript, and maps |
| [backend/](backend/README.md) | Express routes, authorization middleware, uploads, and search |
| [database/](database/README.md) | Schema, migrations, and row-level security policies |

## Local setup

Use a Node.js version compatible with Next.js 16, npm, and a Supabase project. Install from the committed lockfiles with `npm ci`.

1. Clone the repository and follow the [database setup](database/README.md).
2. Create `backend/.env` with the server configuration below.
3. Create `frontend/.env.local` with the browser configuration below.
4. Start each application in its own terminal.

**Backend configuration**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
PORT=8080
```

**Frontend configuration**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

Map features need the Google Maps configuration used by the relevant frontend component. The Supabase service-role key belongs only on the server; never use a `NEXT_PUBLIC_` prefix for it.

```bash
# Terminal 1, from the repository root
cd backend
npm ci
npm run dev
```

```bash
# Terminal 2, from the repository root
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. The API defaults to http://localhost:8080. Configure Supabase authentication redirects and permitted API origins for your local or deployed frontend.

## Verify the setup

- Search for a known book from your seeded catalog.
- Check reader, librarian, and administrator access with separate test accounts.
- Upload a small sample catalog and confirm it appears in search.
- Check location sorting with and without browser geolocation permission.
- Run `npm run lint` and `npm run build` from `frontend/`.

These checks describe how to verify a setup; they are not a claim that a deployed environment has passed them.

## Deployment and configuration

[DEPLOY.md](DEPLOY.md) documents the Vercel frontend and Render backend approach. It is a setup guide, not evidence of a currently available public deployment. Supply environment variables through the hosting platform and apply database changes deliberately.

Optional services include Meilisearch and email delivery. Review `backend/src/services/` and the deployment guide before enabling them.

## Project notes

[BOOKSCAVANGER_NOTES.md](BOOKSCAVANGER_NOTES.md), [BOOKSCAVANGER_TICKETS.md](BOOKSCAVANGER_TICKETS.md), and [P3.md](P3.md) contain implementation notes and planning history. Planned items should be distinguished from implemented behavior.

The separate [backend](https://github.com/jay2323-tech/bookscavanger-backend) and [frontend](https://github.com/jay2323-tech/bookscavanger-frontend) repositories contain related standalone versions. This repository brings both applications and the database files together.
