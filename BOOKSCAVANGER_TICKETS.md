# BookScavenger tickets — become the best physical-book search on Earth

Cross off items with `[x]` as you ship.

**North star:** A reader types or scans a book and, in under a second, sees the
nearest in-stock copies with covers, hours, directions, and a clear next action.

---

## Phase plan

| Phase | Theme | Outcome |
|-------|--------|---------|
| **P0** | Search that feels alive | Autocomplete, typo tolerance, filters, covers, prod deploy |
| **P1** | Unfair local advantage | Smart ranking, trending nearby, barcode, hours, map sync |
| **P2** | Magical conversion | Semantic search, holds, book-run planner, alerts, trust |
| **P3** | Platform scale | Dedicated search engine, PWA, ILS sync, edge cache |

---

## Foundation (shipped)

- [x] **BS-001** Brand + marketing site (`/`, `/about`, `/for-libraries`)
- [x] **BS-002** Librarian onboarding + admin approve/reject
- [x] **BS-003** Librarian inventory (add book + Excel upload)
- [x] **BS-004** Distance search + map/directions

---

## P0 — Search that feels alive

- [x] **BS-010** Instant autocomplete (title/author/ISBN typeahead)
- [x] **BS-011** Typo-tolerant search (`pg_trgm` or Meilisearch)
- [x] **BS-012** Filters: radius, available-only, library, sort
- [x] **BS-013** Book covers + metadata enrich (Open Library)
- [x] **BS-014** Did-you-mean + zero-result recovery
- [x] **BS-015** Deploy monorepo (`jay2323-tech/bookscavanger`) to Render + Vercel

---

## P1 — Unfair local advantage

- [x] **BS-020** Ranking v2: distance × availability × popularity
- [x] **BS-021** Popular / trending near you
- [x] **BS-022** ISBN barcode scanner (mobile camera)
- [x] **BS-023** Edition grouping (same work, many ISBNs)
- [x] **BS-024** Library hours + Open now filter
- [x] **BS-025** Clustered results map with list↔map sync
- [x] **BS-026** Search analytics pipeline (queries, zeros, CTR)

---

## P2 — Magical conversion

- [x] **BS-030** Lightweight “books like this” (same author / title tokens)
- [x] **BS-031** Hold / reserve request to library
- [x] **BS-032** Book-run planner (multi-library trip)
- [x] **BS-033** Alerts: notify when title appears nearby
- [x] **BS-034** “I found it” trust signal on results

---

## P3 — Platform scale

- [x] **BS-040** Dedicated search engine (Meilisearch) — opt-in via `MEILI_HOST`; local brew + warm-index + `scripts/meili-sync.js`
- [x] **BS-041** Rate limits + edge cache for public search
- [x] **BS-042** PWA / mobile-first installable app
- [x] **BS-043** ILS / Koha connector for auto inventory sync

See **[P3.md](./P3.md)** for Meili / popularity / ILS setup.

---

## Suggested next

1. Run Supabase migrations **008** + **009** if not already  
2. Turn on Meili in production (Render / Meili Cloud + `MEILI_HOST`)  
3. Optional Phase 4/5: Redis shared cache, semantic recall / LTR
