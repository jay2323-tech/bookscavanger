# BookScavenger — Supabase / Postgres schema
# Run in Supabase SQL editor (or via migrations) on a fresh project.

-- Extensions (optional, for future typo-tolerant search)
-- create extension if not exists pg_trgm;

-- Profiles (role source of truth)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'customer'
    check (role in ('customer', 'librarian', 'admin')),
  created_at timestamptz not null default now()
);

-- Libraries
create table if not exists public.libraries (
  id bigint generated always as identity primary key,
  supabase_user_id uuid references auth.users on delete set null,
  name text not null,
  email text,
  latitude double precision,
  longitude double precision,
  opens_at text default '09:00',
  closes_at text default '20:00',
  approved boolean not null default false,
  rejected boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists libraries_user_idx
  on public.libraries (supabase_user_id);

create unique index if not exists libraries_supabase_user_unique
  on public.libraries (supabase_user_id)
  where supabase_user_id is not null;

-- Books
create table if not exists public.books (
  id bigint generated always as identity primary key,
  library_id bigint not null references public.libraries (id) on delete cascade,
  title text not null,
  author text,
  isbn text,
  quantity integer default 1,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists books_library_idx on public.books (library_id);
create index if not exists books_title_idx on public.books (title);
create index if not exists books_author_idx on public.books (author);
create index if not exists books_isbn_idx on public.books (isbn);

-- Analytics events
create table if not exists public.analytics (
  id bigint generated always as identity primary key,
  event_type text not null,
  library_id bigint references public.libraries (id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Auto-create customer profile on signup (role always customer;
-- librarian/admin are granted only by backend / service role)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
