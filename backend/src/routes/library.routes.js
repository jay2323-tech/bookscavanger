import express from "express";
import {
    addBook,
    getLibraryDashboard,
    getMyBooks,
} from "../controllers/library.controller.js";
import { authenticateLibrary } from "../middleware/authenticateLibrary.js";

const router = express.Router();

router.get("/dashboard", authenticateLibrary, getLibraryDashboard);

router.get("/my-books", authenticateLibrary, getMyBooks);

router.post("/books", authenticateLibrary, addBook);

export default router;
