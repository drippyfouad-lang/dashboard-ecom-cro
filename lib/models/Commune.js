import mongoose from 'mongoose';

const CommuneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Commune name is required'],
      trim: true,
    },
    name_ar: {
      type: String,
      trim: true,
    },
    wilaya_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wilaya',
      required: [true, 'Wilaya is required'],
    },
    code: {
      type: String,
      trim: true,
    },
    // EcoTrack Integration Fields
    ecotrack_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Shipping prices (optional, can inherit from wilaya)
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
    admin_added: {
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
CommuneSchema.index({ wilaya_id: 1 });
CommuneSchema.index({ name: 1 });
// ecotrack_id already has unique: true in schema
CommuneSchema.index({ is_active: 1 });

export default mongoose.models.Commune || mongoose.model('Commune', CommuneSchema);
