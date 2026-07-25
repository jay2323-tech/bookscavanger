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

/** Recent search query → count (popularity signal) */
async function getPopularityMap() {
  const { data, error } = await supabase
    .from("analytics")
    .select("metadata, created_at")
    .eq("event_type", "search")
    .order("created_at", { ascending: false })
    .limit(800);

  if (error) {
    console.error("popularity map:", error.message);
    return {};
  }

  const counts = {};
  for (const row of data || []) {
    const q = String(row.metadata?.query || "")
      .toLowerCase()
      .trim();
    if (!q || q.length < 2) continue;
    counts[q] = (counts[q] || 0) + 1;
  }
  return counts;
}

/**
 * Ranking v2: available × distance × popularity
 * Higher score = better.
 */
function rankScore(book, popularity) {
  const availableBoost = book.available !== false ? 1 : 0.15;
  const dist = book.distance == null ? 40 : book.distance;
  const distanceScore = 1 / (1 + dist / 3); // strong near bias
  const title = (book.title || "").toLowerCase();
  const author = (book.author || "").toLowerCase();
  const pop =
    (popularity[title] || 0) +
    (popularity[author] || 0) * 0.3 +
    Object.entries(popularity).reduce((acc, [q, c]) => {
      if (title.includes(q) || q.includes(title.slice(0, 12))) {
        return acc + c * 0.2;
      }
      return acc;
    }, 0);

  const popularityScore = Math.log1p(pop);
  return availableBoost * (distanceScore * 4 + popularityScore * 1.2);
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
 * q, lat, lng, radius (km), available (true|false), sort (best|distance|title|author)
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
  const sort = ["best", "distance", "title", "author"].includes(req.query.sort)
    ? req.query.sort
    : "best";

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

    const popularity = sort === "best" ? await getPopularityMap() : {};
    let results = rows.map((book) => {
      const mapped = mapBook(book, lat, lng);
      return {
        ...mapped,
        rank_score: rankScore(mapped, popularity),
      };
    });

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
      if (sort === "distance") {
        const da = a.distance ?? Number.POSITIVE_INFINITY;
        const db = b.distance ?? Number.POSITIVE_INFINITY;
        return da - db;
      }
      // best
      return (b.rank_score || 0) - (a.rank_score || 0);
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
        sort,
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
}

/**
 * GET /api/books/suggest?q=
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

/**
 * GET /api/books/trending?lat=&lng=&limit=
 * Popular searches that exist in inventory, nearest copy preferred.
 */
export async function trendingBooks(req, res) {
  const lat = req.query.lat;
  const lng = req.query.lng;
  const limit = Math.min(Number(req.query.limit) || 8, 16);

  try {
    const popularity = await getPopularityMap();
    const topQueries = Object.entries(popularity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([q]) => q);

    // Fallback when analytics is empty: sample available books
    if (topQueries.length === 0) {
      const { data, error } = await supabase
        .from("books")
        .select("title, author, available, libraries(name, latitude, longitude)")
        .eq("available", true)
        .limit(40);

      if (error) throw error;

      const seen = new Set();
      const fallback = [];
      for (const book of data || []) {
        if (!book.libraries || !book.title) continue;
        const key = book.title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const mapped = mapBook(book, lat, lng);
        fallback.push({
          title: mapped.title,
          author: mapped.author,
          library_name: mapped.library_name,
          distance: mapped.distance,
          search_count: 0,
          available: mapped.available !== false,
        });
        if (fallback.length >= limit) break;
      }

      fallback.sort(
        (a, b) =>
          (a.distance ?? 999) - (b.distance ?? 999)
      );
      return res.json(fallback);
    }

    const trending = [];
    const seenTitles = new Set();

    for (const q of topQueries) {
      if (trending.length >= limit) break;
      const safe = sanitize(q);
      if (safe.length < 2) continue;

      const { data, error } = await supabase
        .from("books")
        .select("title, author, available, libraries(name, latitude, longitude)")
        .or(`title.ilike.%${safe}%,author.ilike.%${safe}%`)
        .limit(30);

      if (error || !data?.length) continue;

      const mapped = data
        .filter((b) => b.libraries)
        .map((b) => mapBook(b, lat, lng))
        .sort(
          (a, b) =>
            (a.distance ?? 999) - (b.distance ?? 999)
        );

      const best = mapped[0];
      if (!best?.title) continue;
      const key = best.title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      trending.push({
        title: best.title,
        author: best.author,
        library_name: best.library_name,
        distance: best.distance,
        search_count: popularity[q] || 0,
        available: best.available !== false,
      });
    }

    res.json(trending);
  } catch (err) {
    console.error("Trending error:", err);
    res.status(500).json({ error: "Trending failed" });
  }
}
