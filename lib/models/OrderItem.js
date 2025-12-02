import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    sku: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    selectedSize: {
      type: String,
      default: '',
    },
    selectedColor: {
      type: String,
      default: '',
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total cannot be negative'],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Create indexes
OrderItemSchema.index({ orderId: 1 });
OrderItemSchema.index({ productId: 1 });

export default mongoose.models.OrderItem || mongoose.model('OrderItem', OrderItemSchema);
