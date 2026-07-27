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
import {
  roundCoord,
  searchCache,
  suggestCache,
} from "../utils/cache.js";

const router = express.Router();

const publicLimit = rateLimit({ windowMs: 60_000, max: 90, keyPrefix: "books" });

const searchCacheKey = (req) => {
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
  const latR = roundCoord(lat);
  const lngR = roundCoord(lng);
  return `search:${q}:${latR}:${lngR}:${radius}:${available}:${openNow}:${sort}`;
};

const suggestCacheKey = (req) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q) return null;
  return `suggest:${q}`;
};

router.get("/search", publicLimit, searchCache.wrap(searchCacheKey, searchBooks));
router.get(
  "/suggest",
  publicLimit,
  suggestCache.wrap(suggestCacheKey, suggestBooks)
);
router.get("/trending", publicLimit, trendingBooks);
router.get("/similar", publicLimit, similarBooks);
router.post("/click", publicLimit, trackClick);
router.post("/found", publicLimit, optionalAuth, createFind);

export default router;
