import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  clearProductCache,
  getCacheStats,
} from "../controllers/productController.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);

// ✅ Handle both JSON and multipart form data
router.post("/", (req, res, next) => {
  console.log("Product creation route hit");
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Content-Length:", req.headers['content-length']);

  // Check if request has files or is JSON
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    console.log("Processing multipart form data");
    // Handle multipart form data with files
    upload.array("images", 4)(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed"
        });
      }
      console.log("Files processed:", req.files?.length || 0);
      next();
    });
  } else {
    console.log("Processing JSON data");
    // Handle JSON data without files
    next();
  }
}, createProduct);

router.put("/:id", (req, res, next) => {
  // Check if request has files or is JSON
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    // Handle multipart form data with files
    upload.array("images", 4)(req, res, next);
  } else {
    // Handle JSON data without files
    next();
  }
}, updateProduct);

router.delete("/:id", deleteProduct);

// Admin routes
router.get("/admin/stats", getProductStats);

// Cache management routes (admin only in production)
router.get("/admin/cache-stats", getCacheStats);
router.delete("/admin/cache", clearProductCache);

// Search endpoint with optimized query
router.get("/search", async (req, res) => {
  try {
    const { q, category, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    let query = {
      $text: { $search: q }
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    const products = await Product.find(query, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .limit(parseInt(limit))
      .lean();

    const formattedProducts = products.map(p => ({
      id: p._id.toString(),
      name: p.name,
      price: p.price,
      category: p.category,
      images: p.images,
      description: p.description,
      oldPrice: p.oldPrice || null,
    }));

    res.json({ success: true, products: formattedProducts, query: q });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;



