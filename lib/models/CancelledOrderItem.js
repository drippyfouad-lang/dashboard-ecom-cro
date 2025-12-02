import mongoose from 'mongoose';

const CancelledOrderItemSchema = new mongoose.Schema(
  {
    cancelledOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CancelledOrder',
      required: true,
      index: true,
    },
    originalOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem',
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: {
      type: String,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    selectedSize: {
      type: String,
      default: '',
    },
    selectedColor: {
      type: String,
      default: '',
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Create indexes
CancelledOrderItemSchema.index({ cancelledOrderId: 1 });
CancelledOrderItemSchema.index({ productId: 1 });

export default mongoose.models.CancelledOrderItem || mongoose.model('CancelledOrderItem', CancelledOrderItemSchema);
