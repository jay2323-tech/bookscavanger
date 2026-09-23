# BookScavenger Database

Supabase PostgreSQL schema, migrations, and row-level security policies for the BookScavenger application.

## Files

- `schema.sql`: baseline application schema and signup handling.
- `migrations/`: incremental changes for library hours, holds and alerts, onboarding, verification, invitations, signup handling, fuzzy search, and search popularity.
- `rls_policies.sql`: row-level security configuration.
- `../backend/db/supabase_policies.md`: additional policy notes.

## Setup and updates

1. Create a development Supabase project.
2. Inspect and apply `schema.sql` as the baseline.
3. Review the numbered files in `migrations/` and apply the pending migrations in numerical order, checking existing objects and dependencies first.
4. Review and apply the applicable policies in `rls_policies.sql` after the referenced tables and functions exist.
5. Configure authentication redirects, create test users, and load a small sample library catalog.
6. Test reader, librarian, and administrator access separately.

For an existing database, inspect its state and take a backup before applying changes. These files are SQL scripts, not an automatic migration runner; do not replay destructive or already-applied changes blindly.

## Roles and credentials

The application distinguishes `customer`, `librarian`, and `admin` roles. Client accounts must not be able to promote themselves by editing their profile. Review both row-level policies and API authorization.

Use the project URL and anon key in the frontend. Keep the service-role key only in backend environment configuration because it has elevated database access.

## Search dependencies

Fuzzy search relies on the relevant `pg_trgm` migration and RPC. Popularity-based ranking relies on the search-popularity schema and functions. Apply the migrations required by the backend revision you deploy.

Return to the [project overview](../README.md) for application setup.
