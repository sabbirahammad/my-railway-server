import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getDeliveryCosts,
  updateDeliveryCosts,
} from "../controllers/deliveryCostController.js";

const router = express.Router();

// Development mode: No authentication required for admin routes
// Delivery cost routes
router.get("/",protect,adminOnly, getDeliveryCosts);
router.post("/",protect,adminOnly, updateDeliveryCosts);

export default router;
