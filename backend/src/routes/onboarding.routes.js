import express from "express";
import { authenticateUser } from "../middleware/authenticateUser.js";
import {
  createLibraryOnboarding,
  getLibraryOnboardingStatus,
  reapplyLibraryOnboarding,
} from "../controllers/onboarding.controller.js";

const router = express.Router();

// GET /api/library/onboarding/status — own application (service role)
router.get(
  "/onboarding/status",
  authenticateUser,
  getLibraryOnboardingStatus
);

// POST /api/library/onboarding — any authenticated user can apply / update pending
router.post("/onboarding", authenticateUser, createLibraryOnboarding);

// POST /api/library/onboarding/reapply — reset rejected application
router.post(
  "/onboarding/reapply",
  authenticateUser,
  reapplyLibraryOnboarding
);

export default router;
