// Load environment variables FIRST
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cartRoutes from "./routes/cartRoutes.js"; // ES module import

// Routes import
import productRouter from "./routes/productRouter.js"; // ES module import
import authRoutes from "./routes/authRoutes.js"; // ES module import
import userRoutes from "./routes/userRoutes.js"; // ES module import
import orderRoutes from "./routes/orderRoutes.js"; // ES module import
import categoryRoutes from "./routes/categoryRoutes.js"; // ES module import
import deliveryCostRoutes from "./routes/deliveryCostRoutes.js"; // ES module import

// Express app init
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));   // Parse JSON body with increased limit for images
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser());   // Parse cookies
app.use(cors({
  origin: true, // Allow all origins in production
  credentials: true
}));           // Allow CORS
app.use(morgan("dev"));    // Logger
app.use(helmet());         // Security headers

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve static files (for images)
app.use(express.static('public'));

// Database connection
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    console.error("❌ Full error:", err);
    // Don't exit immediately, let Railway handle it
  });

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/admin/delivery-costs", deliveryCostRoutes);

// Simple root route
app.get("/", (req, res) => {
  res.send("E-commerce API is running 🚀");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
