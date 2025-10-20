import Product from "../models/productModel.js";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (filePath, folder = "ecommerce_products") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: "auto",
      quality: "auto",
      format: "webp"
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
};

// Helper function to delete image from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || typeof imageUrl !== 'string') return;

    // Extract public_id from Cloudinary URL
    const parts = imageUrl.split("/");
    if (parts.length < 2) return;

    let publicId = parts.slice(-2).join("/").split(".")[0];
    if (/^v\d+\//.test(publicId)) {
      publicId = publicId.split("/").slice(1).join("/");
    }

    if (publicId && publicId.trim() !== "") {
      console.log("Deleting from Cloudinary:", publicId);
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.warn("Failed to delete image from Cloudinary:", imageUrl, error.message);
  }
};

// Cache cleanup function
export const clearProductCache = () => {
  productCache.clear();
};

// Get cache stats for monitoring
export const getCacheStats = () => {
  return {
    size: productCache.size,
    maxAge: CACHE_TTL,
    keys: Array.from(productCache.keys())
  };
};

// Simple in-memory cache for products (in production, use Redis)
const productCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// সব প্রোডাক্ট fetch with pagination and caching
export const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Create cache key
    const cacheKey = `products_${page}_${limit}_${category || 'all'}_${search || 'none'}_${sortBy}_${sortOrder}`;

    // Check cache first
    const cached = productCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Build query
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'price':
        sort.price = sortOrder;
        break;
      case 'name':
        sort.name = sortOrder;
        break;
      case 'rating':
        sort.rating = sortOrder;
        break;
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'oldest':
        sort.createdAt = 1;
        break;
      default:
        sort.createdAt = -1;
    }

    const skip = (page - 1) * limit;

    // Execute query with lean() for better performance
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

    const formattedProducts = products.map(p => ({
      id: p._id.toString(),
      name: p.name,
      price: p.price,
      category: p.category,
      images: p.images,
      isTrending: p.isTrending,
      isTopProduct: p.isTopProduct,
      description: p.description,
      oldPrice: p.oldPrice || null,
      rating: p.rating,
      createdAt: p.createdAt,
    }));

    const result = {
      success: true,
      products: formattedProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    // Cache the result
    productCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// একক প্রোডাক্ট fetch
export const getProductById = async (req, res) => {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ success: false, message: "Product not found" });

    const product = {
      id: p._id.toString(),
      name: p.name,
      price: p.price,
      category: p.category,
      images: p.images,
      isTrending: p.isTrending,
      isTopProduct: p.isTopProduct,
      description: p.description,
      oldPrice: p.oldPrice || null,
    };

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// create product
export const createProduct = async (req, res) => {
  try {
    let imageUrls = [];

    // Handle file uploads if present (from multipart form data)
    if (req.files && req.files.length > 0) {
      console.log("Uploading files to Cloudinary:", req.files.length);

      // Upload each file to Cloudinary
      for (const file of req.files) {
        try {
          const cloudinaryUrl = await uploadToCloudinary(file.path, "ecommerce_products");
          imageUrls.push(cloudinaryUrl);

          // Delete local file after successful upload
          const fs = await import('fs');
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (uploadError) {
          console.error("Error uploading file to Cloudinary:", file.originalname, uploadError);
          // Continue with other files even if one fails
        }
      }
    }

    // Handle images from JSON body (when no files are uploaded)
    if (req.body.images && Array.isArray(req.body.images)) {
      imageUrls = [...imageUrls, ...req.body.images.filter(img => img && img.trim() !== '')];
    }

    console.log("Final image URLs:", imageUrls);

    // Convert price to number
    const productData = {
      ...req.body,
      images: imageUrls,
      price: req.body.price ? parseFloat(req.body.price) : 0,
      oldPrice: req.body.oldPrice ? parseFloat(req.body.oldPrice) : null,
      rating: req.body.rating ? parseFloat(req.body.rating) : 0,
    };

    const product = new Product(productData);
    const saved = await product.save();

    // Clear cache when new product is created
    productCache.clear();

    const formatted = {
      id: saved._id.toString(),
      name: saved.name,
      price: saved.price,
      category: saved.category,
      images: saved.images,
      isTrending: saved.isTrending,
      isTopProduct: saved.isTopProduct,
      description: saved.description,
      oldPrice: saved.oldPrice || null,
      rating: saved.rating,
    };

    res.status(201).json({ success: true, product: formatted });
  } catch (err) {
    console.error("Create product error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// update product
export const updateProduct = async (req, res) => {
  try {
    let updateData = { ...req.body };
    let newImageUrls = [];

    // Get existing product to handle image deletion
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Handle new file uploads if present (from multipart form data)
    if (req.files && req.files.length > 0) {
      console.log("Uploading new files to Cloudinary:", req.files.length);

      // Upload each new file to Cloudinary
      for (const file of req.files) {
        try {
          const cloudinaryUrl = await uploadToCloudinary(file.path, "ecommerce_products");
          newImageUrls.push(cloudinaryUrl);

          // Delete local file after successful upload
          const fs = await import('fs');
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (uploadError) {
          console.error("Error uploading file to Cloudinary:", file.originalname, uploadError);
        }
      }
    }

    // Combine existing images with new ones, or replace entirely
    if (newImageUrls.length > 0) {
      // If replacing images entirely, use only new ones
      if (req.body.replaceImages === 'true') {
        updateData.images = newImageUrls;
      } else {
        // Otherwise, append new images to existing ones
        updateData.images = [...(existingProduct.images || []), ...newImageUrls];
      }
    }

    // Convert price fields to numbers
    if (req.body.price !== undefined) {
      updateData.price = parseFloat(req.body.price);
    }
    if (req.body.oldPrice !== undefined) {
      updateData.oldPrice = req.body.oldPrice ? parseFloat(req.body.oldPrice) : null;
    }
    if (req.body.rating !== undefined) {
      updateData.rating = parseFloat(req.body.rating);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();

    // Clear cache when product is updated
    productCache.clear();

    const formatted = {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      category: product.category,
      images: product.images,
      isTrending: product.isTrending,
      isTopProduct: product.isTopProduct,
      description: product.description,
      oldPrice: product.oldPrice || null,
      rating: product.rating,
    };

    res.json({ success: true, product: formatted });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    // Delete images from Cloudinary before deleting product
    if (product.images && Array.isArray(product.images)) {
      console.log("Deleting product images from Cloudinary:", product.images.length);

      for (let url of product.images) {
        if (!url || typeof url !== 'string') continue;

        // Skip local paths and only process Cloudinary URLs
        if (url.startsWith('http') && url.includes('cloudinary')) {
          await deleteFromCloudinary(url);
        }
      }
    }

    await product.deleteOne();

    // Clear cache when product is deleted
    productCache.clear();

    res.json({ success: true, message: "Product & images deleted successfully" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🟡 Get Product Statistics (Admin) - Optimized with single aggregation
export const getProductStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Single aggregation pipeline for all stats
    const stats = await Product.aggregate([
      {
        $facet: {
          // Basic counts
          counts: [
            { $count: "totalProducts" }
          ],
          // Trending and top products
          trending: [
            { $match: { isTrending: true } },
            { $count: "trendingProducts" }
          ],
          topProducts: [
            { $match: { isTopProduct: true } },
            { $count: "topProducts" }
          ],
          // Recent products
          recent: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $count: "recentProducts" }
          ],
          // Category statistics
          categoryStats: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Price statistics
          priceStats: [
            {
              $group: {
                _id: null,
                averagePrice: { $avg: "$price" },
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" }
              }
            }
          ],
          // Rating statistics
          ratingStats: [
            {
              $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                totalRated: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0] || {};

    res.status(200).json({
      success: true,
      stats: {
        totalProducts: result.counts?.[0]?.totalProducts || 0,
        trendingProducts: result.trending?.[0]?.trendingProducts || 0,
        topProducts: result.topProducts?.[0]?.topProducts || 0,
        recentProducts: result.recent?.[0]?.recentProducts || 0,
        categoryStats: result.categoryStats || [],
        priceStats: result.priceStats?.[0] || { averagePrice: 0, minPrice: 0, maxPrice: 0 },
        ratingStats: result.ratingStats?.[0] || { averageRating: 0, totalRated: 0 }
      }
    });
  } catch (error) {
    console.error("Get product stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

