/**
 * Precomputed search popularity for ranking (Phase 1).
 * Prefers search_popularity table; falls back to a one-shot analytics scan.
 * Always TTL-cached in memory so "best" sort does not hit Postgres every request.
 */

import { supabase, supabaseAdmin } from "../config/db.js";

const TTL_MS = 5 * 60_000;
let cache = { at: 0, map: null };

function normalizeQuery(q) {
  return String(q || "")
    .toLowerCase()
    .trim();
}

async function loadFromTable() {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from("search_popularity")
    .select("query, search_count")
    .order("search_count", { ascending: false })
    .limit(500);

  if (error) {
    if (
      String(error.message).includes("search_popularity") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return null; // migration 009 not applied yet
    }
    console.warn("search_popularity read:", error.message);
    return null;
  }

  const map = {};
  for (const row of data || []) {
    const q = normalizeQuery(row.query);
    if (!q) continue;
    map[q] = Number(row.search_count) || 0;
  }
  return map;
}

async function loadFromAnalyticsScan() {
  const { data, error } = await supabase
    .from("analytics")
    .select("metadata, created_at")
    .eq("event_type", "search")
    .order("created_at", { ascending: false })
    .limit(800);

  if (error) {
    console.error("popularity analytics scan:", error.message);
    return {};
  }

  const counts = {};
  for (const row of data || []) {
    const q = normalizeQuery(row.metadata?.query);
    if (!q || q.length < 2) continue;
    counts[q] = (counts[q] || 0) + 1;
  }
  return counts;
}

/** Query → count map for ranking / trending. */
export async function getPopularityMap() {
  if (cache.map && Date.now() - cache.at < TTL_MS) {
    return cache.map;
  }

  const fromTable = await loadFromTable();
  const map = fromTable ?? (await loadFromAnalyticsScan());
  cache = { at: Date.now(), map };
  return map;
}

/** Invalidate memory cache (e.g. after backfill). */
export function clearPopularityCache() {
  cache = { at: 0, map: null };
}

/**
 * Bump count after a search. Non-blocking; updates memory cache immediately.
 */
export async function recordSearchQuery(rawQuery) {
  const q = normalizeQuery(rawQuery);
  if (!q || q.length < 2) return;

  if (cache.map) {
    cache.map[q] = (cache.map[q] || 0) + 1;
  }

  try {
    const { error } = await supabase.rpc("bump_search_popularity", {
      p_query: q,
    });
    if (error) {
      // Table/RPC missing — memory bump still helps until migration runs
      if (
        !String(error.message).includes("bump_search_popularity") &&
        error.code !== "PGRST202"
      ) {
        console.warn("bump_search_popularity:", error.message);
      }
    }
  } catch (err) {
    console.warn("recordSearchQuery:", err.message);
  }
}
