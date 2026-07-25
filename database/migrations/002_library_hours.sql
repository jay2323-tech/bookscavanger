-- BookScavenger — library hours
-- Run in Supabase SQL editor once.

alter table public.libraries
  add column if not exists opens_at text default '09:00',
  add column if not exists closes_at text default '20:00';

comment on column public.libraries.opens_at is 'Local open time HH:MM (24h)';
comment on column public.libraries.closes_at is 'Local close time HH:MM (24h)';
