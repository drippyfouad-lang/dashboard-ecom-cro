import mongoose from 'mongoose';

const ProductImageSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    image_url: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    public_id: {
      type: String,
      required: [true, 'Public ID is required'],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Create indexes
ProductImageSchema.index({ product_id: 1 });

export default mongoose.models.ProductImage || mongoose.model('ProductImage', ProductImageSchema);
