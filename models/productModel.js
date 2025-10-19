import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    price: { type: Number, required: true, index: true },  // ✅ Fixed: Number for proper sorting
    oldPrice: { type: Number, default: null },
    category: { type: String, required: true, index: true },
    images: [{ type: String }],
    isTrending: { type: Boolean, default: false, index: true },
    isTopProduct: { type: Boolean, default: false, index: true },
    description: { type: String },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    stock: { type: Number, default: 0 },
    tags: [{ type: String, index: true }],
    brand: { type: String, index: true },
    weight: { type: Number },
    dimensions: { type: String },
    sku: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    // Add compound indexes for common queries
    indexes: [
      { key: { category: 1, price: 1 } },
      { key: { isTrending: 1, createdAt: -1 } },
      { key: { isTopProduct: 1, rating: -1 } },
      { key: { name: 'text', description: 'text' } } // Text search
    ]
  }
);

// Add virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', { virtuals: true });

const Product = mongoose.model("Product", productSchema);

export default Product;
