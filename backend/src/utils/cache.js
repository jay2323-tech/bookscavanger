/**
 * Tiny TTL cache for public GET responses (single instance).
 */
export function createTtlCache({ max = 200, ttlMs = 30_000 } = {}) {
  const map = new Map();

  const get = (key) => {
    const hit = map.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expires) {
      map.delete(key);
      return null;
    }
    // refresh LRU order
    map.delete(key);
    map.set(key, hit);
    return hit.value;
  };

  const set = (key, value) => {
    if (map.size >= max) {
      const oldest = map.keys().next().value;
      map.delete(oldest);
    }
    map.set(key, { value, expires: Date.now() + ttlMs });
  };

  const wrap =
    (keyFn, handler) =>
    async (req, res, next) => {
      try {
        const key = keyFn(req);
        if (key) {
          const cached = get(key);
          if (cached) {
            res.setHeader("X-Cache", "HIT");
            res.setHeader(
              "Cache-Control",
              "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
            );
            return res.status(cached.status).json(cached.body);
          }
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
          if (key && res.statusCode >= 200 && res.statusCode < 300) {
            set(key, { status: res.statusCode || 200, body });
            res.setHeader("X-Cache", "MISS");
            res.setHeader(
              "Cache-Control",
              "public, max-age=15, s-maxage=30, stale-while-revalidate=60"
            );
          }
          return originalJson(body);
        };

        return handler(req, res, next);
      } catch (err) {
        next?.(err);
      }
    };

  return { get, set, wrap };
}

export const searchCache = createTtlCache({ max: 300, ttlMs: 30_000 });
export const suggestCache = createTtlCache({ max: 200, ttlMs: 15_000 });

/** Round coords so nearby users share cache entries (~1km buckets). */
export function roundCoord(value, decimals = 2) {
  const n = Number(value);
  if (value === "" || value == null || Number.isNaN(n)) return "";
  return n.toFixed(decimals);
}
