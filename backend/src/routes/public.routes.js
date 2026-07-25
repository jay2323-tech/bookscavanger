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

const router = express.Router();

router.get("/search", searchBooks);
router.get("/suggest", suggestBooks);
router.get("/trending", trendingBooks);
router.get("/similar", similarBooks);
router.post("/click", trackClick);
router.post("/found", optionalAuth, createFind);

export default router;
