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
router.get("/admin/all", adminOnly, getAllOrders);
router.get("/admin/filtered", adminOnly, getFilteredOrders);
router.get("/admin/stats", adminOnly, getOrderStats);
router.get("/admin/export", adminOnly, exportOrders);
router.get("/admin/delivery-costs", adminOnly, getDeliveryCosts);
router.post("/admin/delivery-costs", adminOnly, updateDeliveryCosts);
router.get("/admin/:orderId", adminOnly, getOrderById);
router.put("/admin/:orderId/status", adminOnly, updateOrderStatus);
router.put("/admin/:orderId/cancel", adminOnly, cancelOrder);
router.post("/admin/:orderId/note", adminOnly, addAdminNote);
router.put("/admin/:orderId/verify-payment", adminOnly, verifyPaymentProof);
router.post("/admin/bulk-status", adminOnly, bulkUpdateOrderStatus);

export default router;