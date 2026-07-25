import express from "express";
import {
  searchBooks,
  similarBooks,
  suggestBooks,
  trackClick,
  trendingBooks,
} from "../controllers/public.controller.js";
import { createFind } from "../controllers/reader.controller.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { searchCache } from "../utils/cache.js";

const router = express.Router();

const publicLimit = rateLimit({ windowMs: 60_000, max: 90, keyPrefix: "books" });

const cacheKey = (req) => {
  const {
    q = "",
    lat = "",
    lng = "",
    radius = "",
    available = "",
    openNow = "",
    sort = "",
  } = req.query;
  if (!q) return null;
  return `search:${q}:${lat}:${lng}:${radius}:${available}:${openNow}:${sort}`;
};

router.get("/search", publicLimit, searchCache.wrap(cacheKey, searchBooks));
router.get("/suggest", publicLimit, suggestBooks);
router.get("/trending", publicLimit, trendingBooks);
router.get("/similar", publicLimit, similarBooks);
router.post("/click", publicLimit, trackClick);
router.post("/found", publicLimit, optionalAuth, createFind);

export default router;
