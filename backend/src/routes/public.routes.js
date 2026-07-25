import express from "express";
import {
  searchBooks,
  suggestBooks,
  trendingBooks,
  trackClick,
} from "../controllers/public.controller.js";

const router = express.Router();

router.get("/search", searchBooks);
router.get("/suggest", suggestBooks);
router.get("/trending", trendingBooks);
router.post("/click", trackClick);

export default router;
