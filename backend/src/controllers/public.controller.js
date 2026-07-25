import { supabase } from "../config/db.js";
import { calculateDistance } from "../utils/distance.js";

/** Escape for PostgREST or() filter values */
function sanitize(q = "") {
  return String(q)
    .trim()
    .replace(/[%_,.()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function levenshtein(a, b) {
  const s = (a || "").toLowerCase();
  const t = (b || "").toLowerCase();
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const row = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    let prev = i;
    for (let j = 1; j <= t.length; j++) {
      const cur =
        s[i - 1] === t[j - 1]
          ? row[j - 1]
          : 1 + Math.min(row[j - 1], prev, row[j]);
      row[j - 1] = prev;
      prev = cur;
    }
    row[t.length] = prev;
  }
  return row[t.length];
}

function similarity(query, text) {
  const q = (query || "").toLowerCase();
  const t = (text || "").toLowerCase();
  if (!q || !t) return 0;
  if (t.includes(q)) return 1;
  const dist = levenshtein(q, t.slice(0, Math.max(q.length + 5, q.length)));
  const maxLen = Math.max(q.length, Math.min(t.length, q.length + 5));
  return Math.max(0, 1 - dist / maxLen);
}

function mapBook(book, lat, lng) {
  const lib = book.libraries;
  const distance =
    lat && lng && lib?.latitude != null && lib?.longitude != null
      ? calculateDistance(lat, lng, lib.latitude, lib.longitude)
      : null;

  return {
    ...book,
    library_name: lib?.name ?? null,
    latitude: lib?.latitude ?? null,
    longitude: lib?.longitude ?? null,
    distance,
  };
}

async function fetchMatchingBooks(q) {
  const { data, error } = await supabase
    .from("books")
    .select("*, libraries(name, latitude, longitude)")
    .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`)
    .limit(200);

  if (error) throw error;
  return (data || []).filter((b) => b.libraries);
}

async function fetchFuzzyCandidates(q) {
  const prefix = q.slice(0, Math.min(4, q.length));
  if (prefix.length < 2) return [];

  const { data, error } = await supabase
    .from("books")
    .select("*, libraries(name, latitude, longitude)")
    .or(`title.ilike.%${prefix}%,author.ilike.%${prefix}%`)
    .limit(300);

  if (error) throw error;

  return (data || [])
    .filter((b) => b.libraries)
    .map((b) => ({
      book: b,
      score: Math.max(
        similarity(q, b.title),
        similarity(q, b.author || "")
      ),
    }))
    .filter((x) => x.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 80)
    .map((x) => x.book);
}

/**
 * GET /api/books/search
 * q, lat, lng, radius (km), available (true|false), sort (distance|title|author)
 */
export async function searchBooks(req, res) {
  const q = sanitize(req.query.q || "");
  const lat = req.query.lat;
  const lng = req.query.lng;
  const radius =
    req.query.radius != null && req.query.radius !== ""
      ? Number(req.query.radius)
      : null;
  const availableOnly =
    req.query.available === "true" || req.query.available === "1";
  const sort = ["distance", "title", "author"].includes(req.query.sort)
    ? req.query.sort
    : "distance";

  if (!q) {
    return res.status(400).json({ error: "Query q is required" });
  }

  try {
    let rows = await fetchMatchingBooks(q);
    let fuzzy = false;
    let suggestion = null;

    if (rows.length === 0 && q.length >= 3) {
      rows = await fetchFuzzyCandidates(q);
      fuzzy = rows.length > 0;
      if (fuzzy && rows[0]?.title) {
        suggestion = rows[0].title;
      }
    }

    let results = rows.map((book) => mapBook(book, lat, lng));

    if (availableOnly) {
      results = results.filter((b) => b.available !== false);
    }

    if (radius != null && !Number.isNaN(radius) && radius > 0) {
      results = results.filter(
        (b) => b.distance != null && b.distance <= radius
      );
    }

    results.sort((a, b) => {
      if (sort === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sort === "author") {
        return (a.author || "").localeCompare(b.author || "");
      }
      const da = a.distance ?? Number.POSITIVE_INFINITY;
      const db = b.distance ?? Number.POSITIVE_INFINITY;
      return da - db;
    });

    await supabase
      .from("analytics")
      .insert({
        event_type: "search",
        metadata: {
          query: q,
          fuzzy,
          count: results.length,
          radius,
          availableOnly,
          sort,
        },
      })
      .then()
      .catch((err) => console.error("Analytics error:", err));

    res.json({
      results,
      meta: {
        query: q,
        fuzzy,
        suggestion: fuzzy ? suggestion : null,
        count: results.length,
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
}

/**
 * GET /api/books/suggest?q=
 * Autocomplete suggestions (titles + authors)
 */
export async function suggestBooks(req, res) {
  const q = sanitize(req.query.q || "");
  if (q.length < 2) {
    return res.json([]);
  }

  try {
    const { data, error } = await supabase
      .from("books")
      .select("title, author, isbn")
      .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`)
      .limit(40);

    if (error) return res.status(500).json({ error: error.message });

    const seen = new Set();
    const suggestions = [];

    for (const row of data || []) {
      const titleKey = `t:${(row.title || "").toLowerCase()}`;
      if (row.title && !seen.has(titleKey)) {
        seen.add(titleKey);
        suggestions.push({
          type: "title",
          label: row.title,
          secondary: row.author || null,
        });
      }
      if (suggestions.length >= 8) break;
    }

    for (const row of data || []) {
      if (suggestions.length >= 8) break;
      const author = (row.author || "").trim();
      if (!author) continue;
      const authorKey = `a:${author.toLowerCase()}`;
      if (seen.has(authorKey)) continue;
      if (!author.toLowerCase().includes(q.toLowerCase())) continue;
      seen.add(authorKey);
      suggestions.push({
        type: "author",
        label: author,
        secondary: "Author",
      });
    }

    res.json(suggestions);
  } catch (err) {
    console.error("Suggest error:", err);
    res.status(500).json({ error: "Suggest failed" });
  }
}
