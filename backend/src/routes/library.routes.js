import express from "express";
import {
    addBook,
    getLibraryDashboard,
    getMyBooks,
    syncIls,
    updateLibraryHours,
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

router.patch("/hours", authenticateLibrary, updateLibraryHours);

router.post("/ils/sync", authenticateLibrary, syncIls);

router.get("/holds", authenticateLibrary, libraryHolds);
router.patch("/holds/:id", authenticateLibrary, updateHoldStatus);

export default router;
