-- Precomputed search popularity (Phase 1) — avoids scanning analytics on every search.
-- Run in Supabase SQL editor.

create table if not exists public.search_popularity (
  query text primary key,
  search_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists search_popularity_count_idx
  on public.search_popularity (search_count desc);

-- Upsert helper used by the API (service role / security definer)
create or replace function public.bump_search_popularity(p_query text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := lower(trim(both from coalesce(p_query, '')));
begin
  if length(q) < 2 then
    return;
  end if;

  insert into public.search_popularity (query, search_count, updated_at)
  values (q, 1, now())
  on conflict (query) do update
    set search_count = public.search_popularity.search_count + 1,
        updated_at = now();
end;
$$;

grant execute on function public.bump_search_popularity(text)
  to anon, authenticated, service_role;

-- One-time backfill from recent search analytics (safe to re-run)
insert into public.search_popularity (query, search_count, updated_at)
select
  lower(trim(both from coalesce(metadata->>'query', ''))),
  count(*)::bigint,
  max(created_at)
from public.analytics
where event_type = 'search'
  and length(trim(both from coalesce(metadata->>'query', ''))) >= 2
group by 1
on conflict (query) do update
  set search_count = greatest(
        public.search_popularity.search_count,
        excluded.search_count
      ),
      updated_at = greatest(
        public.search_popularity.updated_at,
        excluded.updated_at
      );

comment on table public.search_popularity is
  'Aggregated search query counts for ranking (Phase 1)';
