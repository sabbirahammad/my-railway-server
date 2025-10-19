import express from "express";
import {
  getHeroNavbarImage,
  uploadHeroNavbarImage,
  deleteHeroNavbarImage,
} from "../controllers/heroNavbarController.js";
import upload from "../middlewares/multer.js";
import fs from "fs";
import path from "path";
import HeroNavbar from "../models/heroNavbarModel.js";

const router = express.Router();

// Test route to verify the router is working
router.get("/test", (req, res) => {
  res.json({ success: true, message: "HeroNavbar routes are working!" });
});

// Get current HeroNavbar image
router.get("/", getHeroNavbarImage);

// Upload new HeroNavbar image (replaces existing) with error handling
router.post("/upload", (req, res, next) => {
  console.log("HeroNavbar upload route hit");
  const uploadSingle = upload.single("image");
  uploadSingle(req, res, (err) => {
    if (err) {
      console.error("Multer error in heroNavbar route:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed"
      });
    }
    console.log("Multer processing completed, calling controller");
    next();
  });
}, uploadHeroNavbarImage);

// Delete HeroNavbar image
router.delete("/:id", deleteHeroNavbarImage);

// Serve image as base64 to avoid CORS issues
router.get("/image-data", async (req, res) => {
  try {
    // Get the current hero navbar image from database
    const heroNavbar = await HeroNavbar.findOne({ isActive: true }).sort({ createdAt: -1 });

    if (!heroNavbar || !heroNavbar.image) {
      return res.status(404).json({
        success: false,
        message: "No image found"
      });
    }

    // Extract the filename from the image path
    const imagePath = heroNavbar.image.replace(/\\/g, '/');
    const filename = imagePath.split('/').pop();
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filename);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: "Image file not found"
      });
    }

    // Read file and convert to base64
    const imageBuffer = fs.readFileSync(fullPath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(filename).toLowerCase();
    const mimeType = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';

    res.json({
      success: true,
      image: `data:${mimeType};base64,${base64Image}`,
      mimeType: mimeType,
      filename: filename
    });

  } catch (error) {
    console.error("Error serving image data:", error);
    res.status(500).json({
      success: false,
      message: "Error loading image"
    });
  }
});

export default router;