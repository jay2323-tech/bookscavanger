import express from "express";
import { authenticateUser } from "../middleware/authenticateUser.js";
import { createLibraryOnboarding } from "../controllers/onboarding.controller.js";

const router = express.Router();

// POST /api/library/onboarding — any authenticated user can apply
router.post(
    "/onboarding",
    authenticateUser,
    createLibraryOnboarding
);

export default router;
