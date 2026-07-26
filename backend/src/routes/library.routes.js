import express from "express";
import {
  addBook,
  deleteBook,
  deleteLibraryAccount,
  getLibraryDashboard,
  getMyBooks,
  syncIls,
  updateBook,
  updateLibraryHours,
  updateLibraryProfile,
} from "../controllers/library.controller.js";
import {
  libraryHolds,
  updateHoldStatus,
} from "../controllers/reader.controller.js";
import { authenticateLibrary } from "../middleware/authenticateLibrary.js";

const router = express.Router();

router.get("/dashboard", authenticateLibrary, getLibraryDashboard);

router.get("/my-books", authenticateLibrary, getMyBooks);

router.post("/books", authenticateLibrary, addBook);
router.patch("/books/:id", authenticateLibrary, updateBook);
router.delete("/books/:id", authenticateLibrary, deleteBook);

router.patch("/hours", authenticateLibrary, updateLibraryHours);
router.patch("/profile", authenticateLibrary, updateLibraryProfile);
router.delete("/account", authenticateLibrary, deleteLibraryAccount);

router.post("/ils/sync", authenticateLibrary, syncIls);

router.get("/holds", authenticateLibrary, libraryHolds);
router.patch("/holds/:id", authenticateLibrary, updateHoldStatus);

export default router;
