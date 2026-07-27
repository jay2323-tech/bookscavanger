import express from "express";
import {
  approveLibrarian,
  getAdminStats,
  getAnalytics,
  getLibraries,
  getPendingLibrarians,
  getSearchInsights,
  rejectLibrarian,
  resendLibraryJoinEmail,
  syncMeilisearch,
} from "../controllers/admin.controller.js";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";

const router = express.Router();

router.get("/stats", authenticateAdmin, getAdminStats);
router.get("/analytics", authenticateAdmin, getAnalytics);
router.get("/libraries", authenticateAdmin, getLibraries);
router.get("/search-insights", authenticateAdmin, getSearchInsights);
router.get("/pending-librarians", authenticateAdmin, getPendingLibrarians);
router.post("/approve-librarian", authenticateAdmin, approveLibrarian);
router.post("/reject-librarian", authenticateAdmin, rejectLibrarian);
router.post("/resend-join-email", authenticateAdmin, resendLibraryJoinEmail);
router.post("/meili-sync", authenticateAdmin, syncMeilisearch);

export default router;
