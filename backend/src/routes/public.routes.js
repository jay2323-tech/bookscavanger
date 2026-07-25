import express from "express";
import {
  searchBooks,
  suggestBooks,
  trendingBooks,
} from "../controllers/public.controller.js";

const router = express.Router();

router.get("/search", searchBooks);
router.get("/suggest", suggestBooks);
router.get("/trending", trendingBooks);

export default router;
