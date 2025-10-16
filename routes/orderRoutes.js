import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  submitPaymentProof,
  getPaymentProof,
  getUserOrders,
  cancelOrder,
  verifyPaymentProof,
  addAdminNote,
  getFilteredOrders,
  bulkUpdateOrderStatus,
  exportOrders,
  getDeliveryCosts,
  updateDeliveryCosts,
} from "../controllers/orderController.js";

const router = express.Router();

// User routes
router.post("/", protect, createOrder);
router.get("/user/:orderId", protect, getOrderById); // Users can get their own orders
router.get("/", protect, getUserOrders); // Users can get all their orders
router.post("/:orderId/payment-proof", protect, submitPaymentProof);
router.get("/:orderId/payment-proof", protect, getPaymentProof);

// Admin routes (admin only)
router.get("/admin/all", getAllOrders);
router.get("/admin/filtered", getFilteredOrders);
router.get("/admin/stats", getOrderStats);
router.get("/admin/export", exportOrders);
router.get("/admin/delivery-costs", getDeliveryCosts);
router.post("/admin/delivery-costs", updateDeliveryCosts);
router.get("/admin/:orderId", getOrderById);
router.put("/admin/:orderId/status", updateOrderStatus);
router.put("/admin/:orderId/cancel", cancelOrder);
router.post("/admin/:orderId/note", addAdminNote);
router.put("/admin/:orderId/verify-payment", verifyPaymentProof);
router.post("/admin/bulk-status", bulkUpdateOrderStatus);

export default router;