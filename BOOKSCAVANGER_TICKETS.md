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
- [ ] **BS-013** Book covers + metadata enrich (Open Library) — deferred for last
- [x] **BS-014** Did-you-mean + zero-result recovery
- [ ] **BS-015** Deploy monorepo (`jay2323-tech/bookscavanger`) to Render + Vercel

---

## P1 — Unfair local advantage

- [x] **BS-020** Ranking v2: distance × availability × popularity
- [x] **BS-021** Popular / trending near you
- [ ] **BS-022** ISBN barcode scanner (mobile camera) — deferred for last
- [x] **BS-023** Edition grouping (same work, many ISBNs)
- [x] **BS-024** Library hours + Open now filter
- [x] **BS-025** Clustered results map with list↔map sync
- [x] **BS-026** Search analytics pipeline (queries, zeros, CTR)

---

## P2 — Magical conversion

- [ ] **BS-030** Semantic search (“books like Atomic Habits”)
- [ ] **BS-031** Hold / reserve request to library
- [ ] **BS-032** Book-run planner (multi-library trip)
- [ ] **BS-033** Alerts: notify when title appears nearby
- [ ] **BS-034** “I found it” trust signal on results

---

## P3 — Platform scale

- [ ] **BS-040** Dedicated search engine (Meilisearch / Typesense)
- [ ] **BS-041** Rate limits + edge cache for public search
- [ ] **BS-042** PWA / mobile-first installable app
- [ ] **BS-043** ILS / Koha connector for auto inventory sync

---

## Suggested next 2 weeks

1. **BS-015** — Finish Vercel + Render on monorepo  
2. **BS-010 + BS-012** — Autocomplete & filters  
3. **BS-011** — Typo tolerance  
4. **BS-013** — Covers  
5. **BS-020** — Ranking v2  
