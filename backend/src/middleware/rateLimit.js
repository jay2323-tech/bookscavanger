/**
 * Simple in-memory IP rate limiter.
 * Suitable for single-instance Render free tier.
 */
export function rateLimit({
  windowMs = 60_000,
  max = 60,
  keyPrefix = "rl",
} = {}) {
  const hits = new Map();

  const prune = (now) => {
    if (hits.size < 5000) return;
    for (const [k, v] of hits) {
      if (now - v.start > windowMs) hits.delete(k);
    }
  };

  return (req, res, next) => {
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    prune(now);

    let entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }
    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({
        error: "Too many requests — slow down and try again",
      });
    }
    next();
  };
}
