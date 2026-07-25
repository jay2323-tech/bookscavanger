# Supabase hardening recommendations

This file contains recommended SQL and guidance to ensure clients cannot escalate themselves to the `admin` role.

Important: your project currently stores role information in `auth` user metadata (via `user_metadata.role`). Supabase's `auth` schema is managed by the platform; best practice is to maintain a separate `profiles` table and apply RLS policies that prevent clients from setting privileged roles.

1) Create a `profiles` table (if you don't have one) and copy role information there on user creation. Example schema:

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade,
  full_name text,
  role text default 'customer',
  created_at timestamptz default now(),
  primary key (id)
);
```

2) Enable RLS and add a restrictive policy so only the server (or admin users) can change `role`:

```sql
alter table public.profiles enable row level security;

-- allow users to insert their own profile (but only with role = 'customer')
create policy "allow_self_insert_customer" on public.profiles for insert
  with check ( auth.uid() = id and role = 'customer' );

-- allow users to update their own profile but not change role
create policy "allow_self_update_no_role_change" on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id and role = old.role );

-- Note: The Supabase service role bypasses RLS entirely, so no explicit policy is needed
-- for service-role updates. Role elevation is performed server-side using the Supabase
-- admin API (supabaseAdmin.auth.admin.updateUserById or direct service-role queries).
-- Do not expose the service role key to client code.
```

3) Provide a server endpoint (using the Supabase service-role key) to change a user's role to `librarian` or `admin`. Only the server should call `supabaseAdmin.auth.admin.updateUserById(...)` or update `profiles.role` using the service role.

4) (Optional) To sync role changes to `auth.users.user_metadata`, use a server-side handler
that listens for role changes and calls the Supabase admin API. For example:

```sql
create or replace function public.sync_profile_role_to_auth() returns trigger as $$
begin
  -- Notify application to sync role to auth metadata
  -- The actual update to auth.users.user_metadata must be performed by the server/app
  -- layer upon receiving the 'sync_role' notification (using supabaseAdmin.auth.admin.updateUserById).
  perform pg_notify('sync_role', json_build_object('id', NEW.id, 'role', NEW.role)::text);
  return NEW;
end; $$ language plpgsql security definer;

create trigger trg_sync_profile_role
  after update of role on public.profiles
  for each row execute function public.sync_profile_role_to_auth();
```

Your backend server should listen on the `sync_role` channel and call `supabaseAdmin.auth.admin.updateUserById(id, { user_metadata: { role } })` to complete the sync.

Notes
- The key idea: never trust client-provided `role` values. Only allow role elevation via server paths that use the Supabase service role key.
- If you prefer the auth metadata route, ensure you do not expose the service role to client code and only update `auth.users` via `supabaseAdmin` on the server.

If you'd like, I can add a server endpoint example for promoting a user to `admin` (protected by an existing admin middleware) and/or a migration to add `profiles` and copy roles there.