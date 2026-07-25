import express from "express";
import {
    approveLibrarian,
    getAdminStats,
    getAnalytics,
    getPendingLibrarians,
    getSearchInsights,
    rejectLibrarian,
} from "../controllers/admin.controller.js";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";

const router = express.Router();

router.get("/stats", authenticateAdmin, getAdminStats);
router.get("/analytics", authenticateAdmin, getAnalytics);
router.get("/search-insights", authenticateAdmin, getSearchInsights);
router.get("/pending-librarians", authenticateAdmin, getPendingLibrarians);
router.post("/approve-librarian", authenticateAdmin, approveLibrarian);
router.post("/reject-librarian", authenticateAdmin, rejectLibrarian);

export default router;
