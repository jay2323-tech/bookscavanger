-- Typo-tolerant fuzzy search via pg_trgm (Phase 2 — Meilisearch deferred)
-- Run in Supabase SQL editor. Requires privileges to create extension.

create extension if not exists pg_trgm;

create index if not exists books_title_trgm_idx
  on public.books using gin (title gin_trgm_ops);

create index if not exists books_author_trgm_idx
  on public.books using gin (author gin_trgm_ops);

-- Returns book ids ranked by trigram similarity to the query
create or replace function public.fuzzy_search_book_ids(
  p_query text,
  p_limit int default 80
)
returns table (id bigint, score double precision)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := trim(both from coalesce(p_query, ''));
  pref text;
begin
  if length(q) < 2 then
    return;
  end if;

  pref := left(q, greatest(2, least(4, length(q))));

  return query
  select
    b.id,
    greatest(
      similarity(coalesce(b.title, ''), q),
      similarity(coalesce(b.author, ''), q)
    )::double precision as score
  from public.books b
  where
    coalesce(b.title, '') % q
    or coalesce(b.author, '') % q
    or b.title ilike '%' || pref || '%'
    or coalesce(b.author, '') ilike '%' || pref || '%'
  order by score desc
  limit greatest(1, least(coalesce(p_limit, 80), 200));
end;
$$;

grant execute on function public.fuzzy_search_book_ids(text, int)
  to anon, authenticated, service_role;

comment on function public.fuzzy_search_book_ids is
  'Typo-tolerant book id ranking using pg_trgm (fallback when Meilisearch is off)';
