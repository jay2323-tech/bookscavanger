-- Fix auth signup: "Database error saving new user"
-- Cause: handle_new_user() inserted full_name while live profiles often use `name`.
-- Run in Supabase SQL editor.

-- Ensure common profile columns exist
alter table public.profiles
  add column if not exists name text;

alter table public.profiles
  add column if not exists full_name text;

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists approved boolean not null default false;

-- Backfill name <-> full_name
update public.profiles
set name = coalesce(name, full_name)
where name is null and full_name is not null;

update public.profiles
set full_name = coalesce(full_name, name)
where full_name is null and name is not null;

-- Robust signup trigger: works with name and/or full_name
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  has_name boolean;
  has_full_name boolean;
  has_email boolean;
  has_approved boolean;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    new.email
  );

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'name'
  ) into has_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name'
  ) into has_full_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) into has_email;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'approved'
  ) into has_approved;

  if has_name and has_full_name and has_email and has_approved then
    insert into public.profiles (id, name, full_name, email, role, approved)
    values (new.id, display_name, display_name, new.email, 'customer', false)
    on conflict (id) do nothing;
  elsif has_name and has_approved then
    insert into public.profiles (id, name, role, approved)
    values (new.id, display_name, 'customer', false)
    on conflict (id) do nothing;
  elsif has_name then
    insert into public.profiles (id, name, role)
    values (new.id, display_name, 'customer')
    on conflict (id) do nothing;
  elsif has_full_name then
    insert into public.profiles (id, full_name, role)
    values (new.id, display_name, 'customer')
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, role)
    values (new.id, 'customer')
    on conflict (id) do nothing;
  end if;

  return new;
exception
  when others then
    -- Never block auth.users insert; log and continue
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
