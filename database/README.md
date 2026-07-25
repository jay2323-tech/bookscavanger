# Database (Supabase)

Lectère uses **Supabase** (Postgres + Auth).

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | Core tables: `profiles`, `libraries`, `books`, `analytics` + signup trigger |
| `rls_policies.sql` | Recommended RLS hardening |
| `../backend/db/supabase_policies.md` | Longer-form policy notes (legacy path) |

## Setup

1. Create / resume a Supabase project.
2. Run `schema.sql` in the SQL editor.
3. Run `rls_policies.sql`.
4. Copy project URL + anon key + service role key into:
   - `backend/.env`
   - `frontend/.env.local`

## Roles

| Role | Meaning |
|------|---------|
| `customer` | Default reader |
| `librarian` | Set by admin on library approval |
| `admin` | Platform admin (set manually in Supabase) |

Never let the client elevate `profiles.role` — only the backend service role should.
