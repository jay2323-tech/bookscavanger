import express from "express";
import { authenticateUser } from "../middleware/authenticateUser.js";
import {
  checkAlerts,
  createAlert,
  createFind,
  createHold,
  deleteAlert,
  myAlerts,
  myHolds,
} from "../controllers/reader.controller.js";

const router = express.Router();

router.post("/holds", authenticateUser, createHold);
router.get("/holds", authenticateUser, myHolds);

router.post("/finds", authenticateUser, createFind);
// anonymous find allowed via optional auth — also public route below mirrors this

router.post("/alerts", authenticateUser, createAlert);
router.get("/alerts", authenticateUser, myAlerts);
router.get("/alerts/check", authenticateUser, checkAlerts);
router.delete("/alerts/:id", authenticateUser, deleteAlert);

export default router;
