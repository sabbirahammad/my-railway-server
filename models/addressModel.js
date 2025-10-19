import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    postalCode: {
      type: String,
     
    },
    country: {
      type: String,
      default: "Bangladesh",
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  { timestamps: true }
);

// Ensure only one default address per user
addressSchema.pre("save", async function (next) {
  if (this.isDefault) {
    try {
      // Only update if user exists and this is not a new document
      if (this.user && this._id) {
        await this.constructor.updateMany(
          { user: this.user, _id: { $ne: this._id } },
          { isDefault: false }
        );
      }
    } catch (error) {
      console.error("Error in address pre-save hook:", error);
      // Don't fail the entire save operation, just log the error
    }
  }
  next();
});

const Address = mongoose.model("Address", addressSchema);

export default Address;