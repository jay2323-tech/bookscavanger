import express from "express";
import { authenticateUser } from "../middleware/authenticateUser.js";
import {
  checkAlerts,
  createAlert,
  createFind,
  createHold,
  deleteAlert,
  deleteReaderAccount,
  getReaderProfile,
  myAlerts,
  myHolds,
  updateReaderProfile,
} from "../controllers/reader.controller.js";

const router = express.Router();

router.post("/holds", authenticateUser, createHold);
router.get("/holds", authenticateUser, myHolds);

router.post("/finds", authenticateUser, createFind);

router.post("/alerts", authenticateUser, createAlert);
router.get("/alerts", authenticateUser, myAlerts);
router.get("/alerts/check", authenticateUser, checkAlerts);
router.delete("/alerts/:id", authenticateUser, deleteAlert);

router.get("/profile", authenticateUser, getReaderProfile);
router.patch("/profile", authenticateUser, updateReaderProfile);
router.delete("/account", authenticateUser, deleteReaderAccount);

export default router;
