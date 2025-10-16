import HeroNavbar from "../models/heroNavbarModel.js";
// import { v2 as cloudinary } from "cloudinary";

// Get current HeroNavbar image
export const getHeroNavbarImage = async (req, res) => {
  try {
    const heroNavbar = await HeroNavbar.findOne({ isActive: true }).sort({ createdAt: -1 });

    if (!heroNavbar) {
      return res.status(404).json({
        success: false,
        message: "No HeroNavbar image found"
      });
    }

    res.json({
      success: true,
      heroNavbar: {
        id: heroNavbar._id.toString(),
        image: heroNavbar.image,
        imageName: heroNavbar.imageName,
        isActive: heroNavbar.isActive,
        createdAt: heroNavbar.createdAt,
        updatedAt: heroNavbar.updatedAt
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Upload new HeroNavbar image (replaces existing)
export const uploadHeroNavbarImage = async (req, res) => {
  try {
    let imageUrl, imageName;

    // Handle file uploads if present (from multipart form data)
    if (req.file) {
      imageUrl = req.file.path;
      imageName = req.file.originalname;
    }
    // Handle image URL from JSON body
    else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
      imageName = req.body.imageName || "HeroNavbar Image";
    }
    else {
      return res.status(400).json({
        success: false,
        message: "No image file or URL provided"
      });
    }

    // Find existing HeroNavbar image to delete from Cloudinary
    const existingHeroNavbar = await HeroNavbar.findOne({ isActive: true });

    if (existingHeroNavbar) {
      // Delete old image from Cloudinary
      try {
        const parts = existingHeroNavbar.image.split("/");
        if (parts.length >= 2) {
          let publicId = parts.slice(-2).join("/").split(".")[0];
          if (/^v\d+\//.test(publicId)) {
            publicId = publicId.split("/").slice(1).join("/");
          }

          if (publicId && publicId.trim() !== "") {
            console.log("Deleting old HeroNavbar image from Cloudinary:", publicId);
            // await cloudinary.uploader.destroy(publicId);
          }
        }
      } catch (err) {
        console.warn("Failed to delete old HeroNavbar image from Cloudinary:", err.message);
      }

      // Update existing record
      existingHeroNavbar.image = imageUrl;
      existingHeroNavbar.imageName = imageName;
      existingHeroNavbar.updatedAt = new Date();

      const updated = await existingHeroNavbar.save();

      res.status(200).json({
        success: true,
        message: "HeroNavbar image updated successfully",
        heroNavbar: {
          id: updated._id.toString(),
          image: updated.image,
          imageName: updated.imageName,
          isActive: updated.isActive,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        }
      });
    } else {
      // Create new record
      const newHeroNavbar = new HeroNavbar({
        image: imageUrl,
        imageName: imageName,
        isActive: true
      });

      const saved = await newHeroNavbar.save();

      res.status(201).json({
        success: true,
        message: "HeroNavbar image uploaded successfully",
        heroNavbar: {
          id: saved._id.toString(),
          image: saved.image,
          imageName: saved.imageName,
          isActive: saved.isActive,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt
        }
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Delete HeroNavbar image
export const deleteHeroNavbarImage = async (req, res) => {
  try {
    const heroNavbar = await HeroNavbar.findById(req.params.id);
    if (!heroNavbar) {
      return res.status(404).json({
        success: false,
        message: "HeroNavbar image not found"
      });
    }

    // Delete image from Cloudinary
    try {
      const parts = heroNavbar.image.split("/");
      if (parts.length >= 2) {
        let publicId = parts.slice(-2).join("/").split(".")[0];
        if (/^v\d+\//.test(publicId)) {
          publicId = publicId.split("/").slice(1).join("/");
        }

        if (publicId && publicId.trim() !== "") {
          console.log("Deleting HeroNavbar image from Cloudinary:", publicId);
          // await cloudinary.uploader.destroy(publicId);
        }
      }
    } catch (err) {
      console.warn("Failed to delete HeroNavbar image from Cloudinary:", err.message);
    }

    await heroNavbar.deleteOne();

    res.json({
      success: true,
      message: "HeroNavbar image deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};