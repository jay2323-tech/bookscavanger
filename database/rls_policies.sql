-- BookScavenger — RLS recommendations
-- Run after schema.sql. Service role bypasses RLS (backend OK).

alter table public.profiles enable row level security;
alter table public.libraries enable row level security;
alter table public.books enable row level security;
alter table public.analytics enable row level security;

-- Profiles: users read themselves; cannot self-promote role
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own_no_role" on public.profiles;
create policy "profiles_update_own_no_role" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Libraries: anyone can read approved libraries; owners read their own
drop policy if exists "libraries_select_approved_or_own" on public.libraries;
create policy "libraries_select_approved_or_own" on public.libraries
  for select using (
    approved = true
    or supabase_user_id = auth.uid()
  );

-- Books: public read for books in approved libraries
drop policy if exists "books_select_approved_libraries" on public.books;
create policy "books_select_approved_libraries" on public.books
  for select using (
    exists (
      select 1 from public.libraries l
      where l.id = books.library_id
        and (l.approved = true or l.supabase_user_id = auth.uid())
    )
  );

-- Analytics: no direct client writes (backend service role only)
-- Intentionally no insert policy for authenticated clients.
