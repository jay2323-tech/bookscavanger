/**
 * Open Library enrich — covers + light metadata (BS-013).
 * Fast path: ISBN → covers.openlibrary.org CDN (no API round-trip).
 * Slow path: title/author search.json when no ISBN (capped + timed).
 */

const metaCache = new Map(); // key -> { cover_url, year, subjects, fetchedAt }
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6h

function cleanIsbn(isbn) {
  if (!isbn) return "";
  return String(isbn).replace(/\D/g, "").slice(0, 13);
}

export function coverUrlFromIsbn(isbn) {
  const id = cleanIsbn(isbn);
  if (id.length < 10) return null;
  return `https://covers.openlibrary.org/b/isbn/${id}-M.jpg`;
}

function cacheKey(title, author) {
  return `${(title || "").toLowerCase().trim()}|${(author || "").toLowerCase().trim()}`;
}

async function fetchWithTimeout(url, ms = 2500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function lookupByTitleAuthor(title, author) {
  const key = cacheKey(title, author);
  const hit = metaCache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL) return hit;

  const params = new URLSearchParams({ limit: "1" });
  if (title) params.set("title", title.slice(0, 80));
  if (author) params.set("author", author.slice(0, 60));

  const data = await fetchWithTimeout(
    `https://openlibrary.org/search.json?${params}`
  );
  const doc = data?.docs?.[0];
  if (!doc) {
    const empty = { cover_url: null, year: null, subjects: [], fetchedAt: Date.now() };
    metaCache.set(key, empty);
    return empty;
  }

  let cover_url = null;
  if (doc.cover_i) {
    cover_url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  } else if (doc.isbn?.[0]) {
    cover_url = coverUrlFromIsbn(doc.isbn[0]);
  }

  const meta = {
    cover_url,
    year: doc.first_publish_year || null,
    subjects: (doc.subject || []).slice(0, 4),
    isbn: doc.isbn?.[0] ? cleanIsbn(doc.isbn[0]) : null,
    fetchedAt: Date.now(),
  };
  metaCache.set(key, meta);
  if (metaCache.size > 500) {
    const first = metaCache.keys().next().value;
    metaCache.delete(first);
  }
  return meta;
}

/**
 * Mutates editions in place with cover_url, publish_year, subjects.
 * Caps network lookups so search stays snappy.
 */
export async function enrichEditions(editions = [], { maxLookups = 8 } = {}) {
  let lookups = 0;
  const tasks = [];

  for (const e of editions) {
    const isbn =
      cleanIsbn(e.isbns?.[0]) ||
      cleanIsbn(e.copies?.find((c) => c.isbn)?.isbn);

    if (isbn) {
      e.cover_url = coverUrlFromIsbn(isbn);
      e.primary_isbn = isbn;
    }

    if (!e.cover_url && lookups < maxLookups && e.title) {
      lookups += 1;
      tasks.push(
        lookupByTitleAuthor(e.title, e.author).then((meta) => {
          e.cover_url = meta.cover_url;
          e.publish_year = meta.year;
          e.subjects = meta.subjects;
          if (meta.isbn && (!e.isbns || !e.isbns.length)) {
            e.isbns = [meta.isbn];
            e.primary_isbn = meta.isbn;
          }
        })
      );
    }
  }

  if (tasks.length) await Promise.all(tasks);
  return editions;
}
