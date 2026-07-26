# Database (Supabase)

BookScavenger uses **Supabase** (Postgres + Auth).

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | Core tables: `profiles`, `libraries`, `books`, `analytics` + signup trigger |
| `rls_policies.sql` | Recommended RLS hardening |
| `migrations/003_p2_holds_finds_alerts.sql` | Holds, finds, alerts |
| `migrations/004_onboarding_hardening.sql` | Safe signup role, unique library user, atomic approve |
| `migrations/005_library_verification.sql` | Website, phone, reject_reason for trust review |
| `../backend/db/supabase_policies.md` | Longer-form policy notes (legacy path) |

## Setup

1. Create / resume a Supabase project.
2. Run `schema.sql` in the SQL editor.
3. Run `rls_policies.sql`.
4. Run pending files under `migrations/` (003 → 004 → 005).
5. Copy project URL + anon key + service role key into:
   - `backend/.env`
   - `frontend/.env.local`

## Roles

| Role | Meaning |
|------|---------|
| `customer` | Default reader |
| `librarian` | Set by admin on library approval |
| `admin` | Platform admin (set manually in Supabase) |

Never let the client elevate `profiles.role` — only the backend service role should.
