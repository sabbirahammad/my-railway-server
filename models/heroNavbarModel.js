import mongoose from "mongoose";

const heroNavbarSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    imageName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const HeroNavbar = mongoose.model("HeroNavbar", heroNavbarSchema);

export default HeroNavbar;