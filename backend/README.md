# BookScavenger API

Express backend for library onboarding, catalog uploads, book discovery, and administrator workflows. Supabase provides authentication and PostgreSQL data storage.

## Run locally

Start in `backend/`. Install dependencies with `npm ci`, create `.env`, and run `npm run dev`.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
PORT=8080
```

The server listens on http://localhost:8080 by default. `npm start` runs the server without the development watcher. A Supabase schema and test accounts must be configured before data-dependent requests work.

## Code organization

- `src/server.js`: middleware, route registration, and server startup.
- `src/routes/`: public, library, upload, authentication, and admin endpoints.
- `src/controllers/`: request handling and database operations.
- `src/middleware/`: authentication and role checks.
- `src/config/`: Supabase clients and database configuration.

The service-role credential is server-only. Configure CORS origins in `src/server.js` for the frontend you run. Keep local environment files out of version control.

## Integration checks

Check the root API response, then exercise search, library onboarding, and catalog upload using a configured database. Test role restrictions with separate librarian and administrator accounts. This package does not define an automated `test` script.

## Related documentation

See the [combined project](https://github.com/jay2323-tech/bookscavanger) for database files, frontend setup, deployment notes, and the broader application workflow. Standalone and combined versions can differ; use the routes and package scripts in the version you run.
