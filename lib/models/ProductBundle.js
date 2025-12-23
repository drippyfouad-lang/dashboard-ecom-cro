import mongoose from 'mongoose';

const ProductBundleSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    discount: {
      type: Number,
      required: [true, 'Discount is required'],
      min: [0, 'Discount cannot be negative'],
    },
    active: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Create indexes
ProductBundleSchema.index({ productId: 1, active: 1 });
ProductBundleSchema.index({ productId: 1, quantity: 1 });
ProductBundleSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.models.ProductBundle || mongoose.model('ProductBundle', ProductBundleSchema);

