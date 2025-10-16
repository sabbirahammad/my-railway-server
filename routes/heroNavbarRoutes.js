import express from "express";
import {
  getHeroNavbarImage,
  uploadHeroNavbarImage,
  deleteHeroNavbarImage,
} from "../controllers/heroNavbarController.js";
// import upload from "../middlewares/multer.js";

const router = express.Router();

// Get current HeroNavbar image
router.get("/", getHeroNavbarImage);

// Upload new HeroNavbar image (replaces existing)
router.post("/upload", uploadHeroNavbarImage);

// Delete HeroNavbar image
router.delete("/:id", deleteHeroNavbarImage);

export default router;