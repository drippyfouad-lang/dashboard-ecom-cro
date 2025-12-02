import mongoose from 'mongoose';

const WilayaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Wilaya name is required'],
      trim: true,
    },
    name_ar: {
      type: String,
      trim: true,
    },
    code: {
      type: Number,
      required: [true, 'Wilaya code is required'],
      min: 1,
      max: 58,
    },
    // EcoTrack Integration Fields
    ecotrack_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Delivery availability
    delivery_to_home: {
      type: Boolean,
      default: true,
    },
    delivery_to_desk: {
      type: Boolean,
      default: true,
    },
    // Shipping prices
    shipping_price_home: {
      type: Number,
      default: 0,
      min: [0, 'Shipping price cannot be negative'],
    },
    shipping_price_desk: {
      type: Number,
      default: 0,
      min: [0, 'Shipping price cannot be negative'],
    },
    // Status
    is_active: {
      type: Boolean,
      default: true,
    },
    imported_from_ecotrack: {
      type: Boolean,
      default: false,
    },
    imported_at: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Create indexes
WilayaSchema.index({ name: 1 });
WilayaSchema.index({ code: 1 });
// ecotrack_id already has unique: true in schema
WilayaSchema.index({ is_active: 1 });

export default mongoose.models.Wilaya || mongoose.model('Wilaya', WilayaSchema);
