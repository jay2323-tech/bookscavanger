import express from "express";
import multer from "multer";
import { uploadBooksExcel } from "../controllers/upload.controller.js";
import { authenticateLibrary } from "../middleware/authenticateLibrary.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/books/upload",
  authenticateLibrary,
  upload.single("file"),
  uploadBooksExcel
);

export default router;
