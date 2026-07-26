-- BookScavenger — onboarding hardening
-- Run in Supabase SQL editor after prior migrations.

-- 1) Always create profiles as customer (ignore client metadata role)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.email
    ),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) One library application per user
create unique index if not exists libraries_supabase_user_unique
  on public.libraries (supabase_user_id)
  where supabase_user_id is not null;

-- 3) Prevent authenticated clients from changing their own role
create or replace function public.profiles_preserve_role()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated'
     and new.role is distinct from old.role then
    raise exception 'Role cannot be changed by the client';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_preserve_role on public.profiles;
create trigger profiles_preserve_role
  before update on public.profiles
  for each row execute function public.profiles_preserve_role();

-- 4) Tighten RLS: role in WITH CHECK must match existing role
alter table public.profiles enable row level security;

drop policy if exists "profiles_update_own_no_role" on public.profiles;
create policy "profiles_update_own_no_role" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- 5) Atomic approve (library + profile role)
create or replace function public.approve_librarian(p_library_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  select supabase_user_id into v_user
  from public.libraries
  where id = p_library_id
  for update;

  if not found then
    raise exception 'Library not found';
  end if;

  update public.libraries
  set approved = true,
      rejected = false
  where id = p_library_id;

  if v_user is not null then
    insert into public.profiles (id, role, approved)
    values (v_user, 'librarian', true)
    on conflict (id) do update
      set role = 'librarian',
          approved = true;
  end if;
end;
$$;

revoke all on function public.approve_librarian(bigint) from public;
grant execute on function public.approve_librarian(bigint) to service_role;
