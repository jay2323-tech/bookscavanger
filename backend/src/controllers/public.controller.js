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

  const opens_at = lib?.opens_at ?? null;
  const closes_at = lib?.closes_at ?? null;

  return {
    ...book,
    library_name: lib?.name ?? null,
    latitude: lib?.latitude ?? null,
    longitude: lib?.longitude ?? null,
    distance,
    opens_at,
    closes_at,
    open_now: isOpenNow(opens_at, closes_at),
  };
}

/** HH:MM local time open check. null hours => unknown (null). */
function isOpenNow(opensAt, closesAt, now = new Date()) {
  if (!opensAt || !closesAt) return null;
  const parse = (s) => {
    const [h, m] = String(s).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const openM = parse(opensAt);
  const closeM = parse(closesAt);
  if (openM == null || closeM == null) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (closeM === openM) return true; // 24h
  if (closeM > openM) return cur >= openM && cur < closeM;
  // overnight e.g. 22:00–06:00
  return cur >= openM || cur < closeM;
}

function editionKey(book) {
  const isbn = (book.isbn || "").replace(/[-\s]/g, "").toLowerCase();
  if (isbn.length >= 10) return `isbn:${isbn}`;
  const title = (book.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const author = (book.author || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `ta:${title}|${author}`;
}

/** Group flat copies into works/editions with multiple library copies. */
function groupIntoEditions(results) {
  const map = new Map();
  for (const book of results) {
    const key = editionKey(book);
    if (!map.has(key)) {
      map.set(key, {
        key,
        title: book.title,
        author: book.author,
        isbns: new Set(),
        copies: [],
        best_distance: book.distance,
        best_rank: book.rank_score ?? 0,
        any_available: book.available !== false,
        any_open_now: book.open_now === true,
      });
    }
    const g = map.get(key);
    if (book.isbn) g.isbns.add(book.isbn);
    g.copies.push({
      id: book.id,
      library_name: book.library_name,
      distance: book.distance,
      available: book.available !== false,
      latitude: book.latitude,
      longitude: book.longitude,
      isbn: book.isbn,
      opens_at: book.opens_at,
      closes_at: book.closes_at,
      open_now: book.open_now,
      rank_score: book.rank_score,
    });
    if (
      book.distance != null &&
      (g.best_distance == null || book.distance < g.best_distance)
    ) {
      g.best_distance = book.distance;
    }
    g.best_rank = Math.max(g.best_rank, book.rank_score ?? 0);
    if (book.available !== false) g.any_available = true;
    if (book.open_now === true) g.any_open_now = true;
  }

  return Array.from(map.values()).map((g) => {
    g.copies.sort(
      (a, b) => (a.distance ?? 999) - (b.distance ?? 999)
    );
    return {
      key: g.key,
      title: g.title,
      author: g.author,
      isbns: Array.from(g.isbns),
      copy_count: g.copies.length,
      library_count: new Set(g.copies.map((c) => c.library_name)).size,
      best_distance: g.best_distance,
      available: g.any_available,
      open_now: g.any_open_now,
      rank_score: g.best_rank,
      // primary (nearest) copy for map pin
      library_name: g.copies[0]?.library_name ?? null,
      latitude: g.copies[0]?.latitude ?? null,
      longitude: g.copies[0]?.longitude ?? null,
      distance: g.best_distance,
      copies: g.copies,
    };
  });
}

async function fetchMatchingBooks(q) {
  const { data, error } = await supabase
    .from("books")
    .select(
      "*, libraries(name, latitude, longitude, opens_at, closes_at)"
    )
    .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`)
    .limit(200);

  if (error) {
    // Fallback if hours columns not migrated yet
    if (String(error.message).includes("opens_at")) {
      const retry = await supabase
        .from("books")
        .select("*, libraries(name, latitude, longitude)")
        .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`)
        .limit(200);
      if (retry.error) throw retry.error;
      return (retry.data || []).filter((b) => b.libraries);
    }
    throw error;
  }
  return (data || []).filter((b) => b.libraries);
}

async function fetchFuzzyCandidates(q) {
  const prefix = q.slice(0, Math.min(4, q.length));
  if (prefix.length < 2) return [];

  let { data, error } = await supabase
    .from("books")
    .select(
      "*, libraries(name, latitude, longitude, opens_at, closes_at)"
    )
    .or(`title.ilike.%${prefix}%,author.ilike.%${prefix}%`)
    .limit(300);

  if (error && String(error.message).includes("opens_at")) {
    const retry = await supabase
      .from("books")
      .select("*, libraries(name, latitude, longitude)")
      .or(`title.ilike.%${prefix}%,author.ilike.%${prefix}%`)
      .limit(300);
    data = retry.data;
    error = retry.error;
  }

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

/**
 * GET /api/books/search
 * q, lat, lng, radius (km), available (true|false), openNow (true|false),
 * sort (best|distance|title|author)
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
  const openNowOnly =
    req.query.openNow === "true" || req.query.openNow === "1";
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

    if (openNowOnly) {
      results = results.filter((b) => b.open_now === true);
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
      return (b.rank_score || 0) - (a.rank_score || 0);
    });

    const editions = groupIntoEditions(results);
    editions.sort((a, b) => {
      if (sort === "title") return (a.title || "").localeCompare(b.title || "");
      if (sort === "author")
        return (a.author || "").localeCompare(b.author || "");
      if (sort === "distance")
        return (a.best_distance ?? 999) - (b.best_distance ?? 999);
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
          editions: editions.length,
          zero: results.length === 0,
          radius,
          availableOnly,
          openNowOnly,
          sort,
        },
      })
      .then()
      .catch((err) => console.error("Analytics error:", err));

    res.json({
      results: editions,
      meta: {
        query: q,
        fuzzy,
        suggestion: fuzzy ? suggestion : null,
        count: editions.length,
        copy_count: results.length,
        sort,
        grouped: true,
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

/**
 * POST /api/books/click
 * Track result engagement for CTR analytics.
 * body: { title, library_name?, query? }
 */
export async function trackClick(req, res) {
  try {
    const { title, library_name, query } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: "title required" });
    }

    await supabase.from("analytics").insert({
      event_type: "result_click",
      metadata: {
        title: String(title).slice(0, 200),
        library_name: library_name ? String(library_name).slice(0, 200) : null,
        query: query ? String(query).slice(0, 120) : null,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("trackClick:", err);
    res.status(500).json({ error: "Click track failed" });
  }
}
