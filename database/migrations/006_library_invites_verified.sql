-- Library invites + verified badge
-- Run in Supabase SQL editor after 005_library_verification.sql

alter table public.libraries
  add column if not exists verified boolean not null default false;

comment on column public.libraries.verified is
  'True when approved library has website, phone, hours, and at least one book';

create table if not exists public.library_invites (
  id bigint generated always as identity primary key,
  token text not null unique,
  note text,
  created_by uuid references auth.users on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_library_id bigint references public.libraries (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists library_invites_token_idx
  on public.library_invites (token);

create index if not exists library_invites_expires_idx
  on public.library_invites (expires_at);
