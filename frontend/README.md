# BookScavenger Web App

Next.js interface for discovering library books and supporting reader, librarian, and administrator workflows. The application uses React, TypeScript, Supabase authentication, and Google Maps components.

## Run locally

Start in `frontend/` and create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Start the matching Express backend on port 8080, or point `NEXT_PUBLIC_BACKEND_URL` at your API. Configure Supabase redirect URLs for the login flows you use. Map screens also need the Google Maps key referenced by their components.

## Structure

- `app/`: pages, layouts, login callbacks, and dashboard routes.
- `app/components/`: shared search and map UI.
- `app/library/`: library authentication, onboarding, and dashboard flows.
- `app/admin/`: administrator pages.

## Build and verification

```bash
npm run lint
npm run build
npm start
```

Verify book search, login redirects, role-specific navigation, and map behavior with a configured API and test data. A successful frontend build alone does not validate backend authorization or database policies.

## Related project

The [combined repository](https://github.com/jay2323-tech/bookscavanger) contains the API, database schema and migrations, and deployment notes. Keep browser keys separate from server credentials; never put a service-role key in a `NEXT_PUBLIC_` variable.
