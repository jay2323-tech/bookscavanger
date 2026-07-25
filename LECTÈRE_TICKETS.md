# Lectère tickets — become the best physical-book search on Earth

Cross off items with `[x]` as you ship. Interactive twin: open the Cursor canvas
`lectere-search-roadmap.canvas.tsx` beside chat (click tickets there to cycle status).

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

- [x] **LEC-001** Brand + marketing site (`/`, `/about`, `/for-libraries`)
- [x] **LEC-002** Librarian onboarding + admin approve/reject
- [x] **LEC-003** Librarian inventory (add book + Excel upload)
- [x] **LEC-004** Distance search + map/directions

---

## P0 — Search that feels alive

- [ ] **LEC-010** Instant autocomplete (title/author/ISBN typeahead)
- [ ] **LEC-011** Typo-tolerant search (`pg_trgm` or Meilisearch)
- [ ] **LEC-012** Filters: radius, available-only, library, sort
- [ ] **LEC-013** Book covers + metadata enrich (Open Library)
- [ ] **LEC-014** Did-you-mean + zero-result recovery
- [ ] **LEC-015** Deploy latest backend to Render (kill production 404s)

---

## P1 — Unfair local advantage

- [ ] **LEC-020** Ranking v2: distance × availability × popularity
- [ ] **LEC-021** Popular / trending near you
- [ ] **LEC-022** ISBN barcode scanner (mobile camera)
- [ ] **LEC-023** Edition grouping (same work, many ISBNs)
- [ ] **LEC-024** Library hours + Open now filter
- [ ] **LEC-025** Clustered results map with list↔map sync
- [ ] **LEC-026** Search analytics pipeline (queries, zeros, CTR)

---

## P2 — Magical conversion

- [ ] **LEC-030** Semantic search (“books like Atomic Habits”)
- [ ] **LEC-031** Hold / reserve request to library
- [ ] **LEC-032** Book-run planner (multi-library trip)
- [ ] **LEC-033** Alerts: notify when title appears nearby
- [ ] **LEC-034** “I found it” trust signal on results

---

## P3 — Platform scale

- [ ] **LEC-040** Dedicated search engine (Meilisearch / Typesense)
- [ ] **LEC-041** Rate limits + edge cache for public search
- [ ] **LEC-042** PWA / mobile-first installable app
- [ ] **LEC-043** ILS / Koha connector for auto inventory sync

---

## Suggested next 2 weeks

1. **LEC-015** — Deploy backend so production matches local  
2. **LEC-010 + LEC-012** — Autocomplete & filters  
3. **LEC-011** — Typo tolerance  
4. **LEC-013** — Covers  
5. **LEC-020** — Ranking v2  

---

## GitHub sync (optional)

`gh` auth is currently invalid on this machine. After:

```bash
gh auth refresh -h github.com
```

we can mirror these as Issues on `bookscavanger-frontend` / `lexoria-backend`.
