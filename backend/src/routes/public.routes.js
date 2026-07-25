import express from "express";
import { searchBooks, suggestBooks } from "../controllers/public.controller.js";

const router = express.Router();

router.get("/search", searchBooks);
router.get("/suggest", suggestBooks);

export default router;
