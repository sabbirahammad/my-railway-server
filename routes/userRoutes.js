import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  getUserOrders,
  getOrderDetails,
  cancelOrder,
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  getUserReviews,
  addReview,
  updateReview,
  deleteReview,
  getDashboardStats,
  getUserStats,
} from "../controllers/userController.js";

const router = express.Router();

// All routes require authentication
// router.use(protect);

// Profile routes
router.get("/profile", getUserProfile);
router.put("/profile", updateUserProfile);

// Order routes
router.get("/orders", getUserOrders);
router.get("/orders/:orderId", getOrderDetails);
router.put("/orders/:orderId/cancel", cancelOrder);

// Address routes
router.get("/addresses", getUserAddresses);
router.post("/addresses", addAddress);
router.put("/addresses/:addressId", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);

// Wishlist routes
router.get("/wishlist", getUserWishlist);
router.post("/wishlist", addToWishlist);
router.delete("/wishlist/:productId", removeFromWishlist);

// Review routes
router.get("/reviews", getUserReviews);
router.post("/reviews", addReview);
router.put("/reviews/:reviewId", updateReview);
router.delete("/reviews/:reviewId", deleteReview);

// Dashboard routes
router.get("/dashboard/stats", getDashboardStats);

// Admin routes
router.get("/admin/stats", getUserStats);

export default router;