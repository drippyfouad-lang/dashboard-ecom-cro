import mongoose from 'mongoose';

const CancelledOrderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    wilayaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wilaya',
    },
    wilayaName: {
      type: String,
    },
    wilayaCode: {
      type: Number,
    },
    communeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commune',
    },
    communeName: {
      type: String,
    },
    shippingAddress: {
      type: String,
      trim: true,
    },
    deliveryType: {
      type: String,
      enum: ['to_home', 'to_desk'],
      default: 'to_home',
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: 'Cash on Delivery',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
    orderNumber: {
      type: String,
    },
    confirmedAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      required: true,
    },
    cancellationNotes: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    originalOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    originalCreatedAt: {
      type: Date,
    },
    ecotrackOrderId: {
      type: String,
      trim: true,
    },
    ecotrackTrackingNumber: {
      type: String,
      trim: true,
    },
    weight: {
      type: Number,
    },
    status: {
      type: String,
      default: 'cancelled',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Create indexes
CancelledOrderSchema.index({ cancelledAt: -1 });
CancelledOrderSchema.index({ cancellationReason: 1 });
CancelledOrderSchema.index({ customerPhone: 1 });
CancelledOrderSchema.index({ wilayaId: 1 });
CancelledOrderSchema.index({ communeId: 1 });

// Compound indexes
CancelledOrderSchema.index({ cancelledAt: -1, cancellationReason: 1 });
CancelledOrderSchema.index({ cancelledBy: 1, cancelledAt: -1 });

export default mongoose.models.CancelledOrder || mongoose.model('CancelledOrder', CancelledOrderSchema);
