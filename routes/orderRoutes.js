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
router.get("/:orderId/payment-proof", protect, getPaymentProof); // Added protect middleware for development mode

// Admin routes (admin only) - Development mode: Authentication handled by middleware
router.get("/admin/all", protect, adminOnly, getAllOrders);
router.get("/admin/filtered", protect, adminOnly, getFilteredOrders);
router.get("/admin/stats", protect, adminOnly, getOrderStats);
router.get("/admin/export", protect, adminOnly, exportOrders);
router.get("/admin/delivery-costs", protect, adminOnly, getDeliveryCosts);
router.post("/admin/delivery-costs", protect, adminOnly, updateDeliveryCosts);
router.get("/admin/:orderId", protect, adminOnly, getOrderById);
router.put("/admin/:orderId/status", protect, adminOnly, updateOrderStatus);
router.put("/admin/:orderId/cancel", protect, adminOnly, cancelOrder);
router.post("/admin/:orderId/note", protect, adminOnly, addAdminNote);
router.put("/admin/:orderId/verify-payment", protect, adminOnly, verifyPaymentProof);
router.post("/admin/bulk-status", protect, adminOnly, bulkUpdateOrderStatus);

export default router;