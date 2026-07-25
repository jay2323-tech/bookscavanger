-- BookScavenger P2 — holds, finds, alerts
-- Run in Supabase SQL editor.

create table if not exists public.hold_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  book_id bigint references public.books (id) on delete set null,
  library_id bigint references public.libraries (id) on delete set null,
  title text not null,
  author text,
  library_name text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists hold_requests_user_idx on public.hold_requests (user_id);
create index if not exists hold_requests_library_idx on public.hold_requests (library_id);

create table if not exists public.book_finds (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete set null,
  title text not null,
  author text,
  library_name text,
  book_id bigint references public.books (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists book_finds_title_idx on public.book_finds (title);

create table if not exists public.search_alerts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  query text not null,
  lat double precision,
  lng double precision,
  radius_km double precision not null default 25,
  active boolean not null default true,
  last_matched_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists search_alerts_user_idx on public.search_alerts (user_id);
