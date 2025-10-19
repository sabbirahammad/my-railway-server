// Load environment variables FIRST
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import cartRoutes from "./routes/cartRoutes.js"; // ES module import

// Routes import
import productRouter from "./routes/productRouter.js"; // ES module import
import authRoutes from "./routes/authRoutes.js"; // ES module import
import userRoutes from "./routes/userRoutes.js"; // ES module import
import orderRoutes from "./routes/orderRoutes.js"; // ES module import
import categoryRoutes from "./routes/categoryRoutes.js"; // ES module import
import deliveryCostRoutes from "./routes/deliveryCostRoutes.js"; // ES module import
import heroNavbarRoutes from "./routes/heroNavbarRoutes.js"; // ES module import

// Express app init
const app = express();

// Performance and Security Middleware
app.use(compression({ level: 6, threshold: 1024 })); // Compress responses
app.use(express.json({ limit: '10mb' }));   // Parse JSON body with increased limit for images
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser());   // Parse cookies
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://admin-ecommarce.web.app',
      'https://outzenbd.com',
      'https://sabbirahammad.github.io',
      'https://my-railway-server-production.up.railway.app',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:3000'
    ];

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan("dev"));    // Logger
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));         // Security headers

// Rate limiting (simple in-memory implementation)
const rateLimit = new Map();
app.use((req, res, next) => {
  const key = req.ip + req.path;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 1000;

  if (!rateLimit.has(key)) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const record = rateLimit.get(key);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({ message: 'Too many requests' });
  }

  record.count++;
  next();
});

// Health check endpoint with performance metrics
app.get("/health", (req, res) => {
  const memUsage = process.memoryUsage();
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    nodeVersion: process.version
  });
});

// Performance metrics endpoint
app.get("/metrics", (req, res) => {
  const memUsage = process.memoryUsage();
  res.status(200).json({
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    },
    uptime: process.uptime(),
    version: process.version,
    platform: process.platform,
    arch: process.arch
  });
});

// Serve static files (for images) with proper CORS headers
app.use('/public', (req, res, next) => {
  // Set CORS headers for static files
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://admin-ecommarce.web.app',
    'https://outzenbd.com',
    'https://sabbirahammad.github.io',
    'https://my-railway-server-production.up.railway.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000'
  ];

  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development' || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
}, express.static('public'));

// Database connection with optimized settings
mongoose
  .connect(process.env.MONGO_URI, {
    // Optimized connection settings for better performance
    serverSelectionTimeoutMS: 30000, // Increased timeout to 30s for production
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 5, // Maintain a minimum of 5 socket connections
    maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
    bufferCommands: false, // Disable mongoose buffering
    retryWrites: true, // Enable retry writes
    retryReads: true, // Enable retry reads
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");

    // Enable mongoose debugging in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', false); // Set to true for detailed query logging
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    console.error("❌ Full error:", err);
    // Don't exit immediately, let Railway handle it
  });

// Handle database connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/admin/delivery-costs", deliveryCostRoutes);
app.use("/api/v1/hero-navbar", heroNavbarRoutes);

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
