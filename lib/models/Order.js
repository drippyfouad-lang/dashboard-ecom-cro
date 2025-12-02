import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      alias: 'customer_name',
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      alias: 'customer_email',
    },
    customerPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      alias: 'customer_phone',
    },
    responded: {
      type: Boolean,
      default: false,
    },
    clientResponded: {
      type: Boolean,
      default: false,
      alias: 'client_responded',
    },
    wilayaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wilaya',
      required: [true, 'Wilaya is required'],
      alias: 'wilaya_id',
    },
    wilayaName: {
      type: String,
      required: [true, 'Wilaya name is required'],
      trim: true,
      alias: 'wilaya_name',
    },
    wilayaCode: {
      type: Number,
      required: [true, 'Wilaya code is required'],
      alias: 'wilaya_code',
    },
    communeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Commune',
      alias: 'commune_id',
    },
    communeName: {
      type: String,
      trim: true,
      alias: 'commune_name',
    },
    shippingAddress: {
      type: String,
      trim: true,
      alias: 'shipping_address',
    },
    deliveryType: {
      type: String,
      enum: ['to_home', 'to_desk'],
      default: 'to_home',
      alias: 'delivery_type',
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative'],
      alias: 'shipping_cost',
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total cannot be negative'],
    },
    paymentMethod: {
      type: String,
      default: 'Cash on Delivery',
      alias: 'payment_method',
    },
    notes: {
      type: String,
      trim: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
      alias: 'order_number',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'pre-sent',
        'sent',
        'shipped',
        'out-for-delivery',
        'delivered',
        'returned',
        'cancelled',
      ],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      alias: 'payment_status',
    },
    paidAt: {
      type: Date,
      default: null,
      alias: 'paid_at',
    },
    confirmedAt: {
      type: Date,
      default: null,
      alias: 'confirmed_at',
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      alias: 'confirmed_by',
    },
    expeditionDate: {
      type: Date,
      default: null,
      alias: 'expedition_date',
    },
    shippingDate: {
      type: Date,
      default: null,
      alias: 'shipping_date',
    },
    deliveryDate: {
      type: Date,
      default: null,
      alias: 'delivery_date',
    },
    returnDate: {
      type: Date,
      default: null,
      alias: 'return_date',
    },
    weight: {
      type: Number,
      default: null,
    },
    ecotrackOrderId: {
      type: String,
      default: null,
      alias: 'ecotrack_order_id',
    },
    ecotrackTrackingNumber: {
      type: String,
      default: null,
      alias: 'ecotrack_tracking_number',
    },
    ecotrackStatus: {
      type: String,
      default: null,
      alias: 'ecotrack_status',
    },
    // Cancellation details
    cancellationReason: {
      type: String,
      enum: ['client-cancelled-by-phone', 'client-did-not-respond', 'other', null],
      default: null,
      alias: 'cancellation_reason',
    },
    cancellationNotes: {
      type: String,
      trim: true,
      default: null,
      alias: 'cancellation_notes',
    },
    cancelledAt: {
      type: Date,
      default: null,
      alias: 'cancelled_at',
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      alias: 'cancelled_by',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Create indexes
OrderSchema.index({ userId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ wilayaId: 1 });
OrderSchema.index({ communeId: 1 });
OrderSchema.index({ customerPhone: 1 });
OrderSchema.index({ cancelledAt: 1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true, sparse: true });
OrderSchema.index({ confirmedAt: -1 });

// Compound indexes for common queries
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, status: 1 });

// Force delete cached model to ensure schema updates
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

OrderSchema.pre('save', function generateOrderNumber(next) {
  if (!this.orderNumber) {
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    this.orderNumber = `ORD-${Date.now()}-${random}`;
  }
  next();
});

export default mongoose.model('Order', OrderSchema);
