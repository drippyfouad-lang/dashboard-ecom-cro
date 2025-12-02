import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true,
    // Remove unique: true from here - we'll handle it at the Product level
  },
  size: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  image: {
    type: String,
    default: '',
  },
}, { _id: false });

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    sizes: [
      {
        type: String,
      },
    ],
    colors: [
      {
        type: String,
      },
    ],
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price cannot be negative'],
    },
    description: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    images: [
      {
        type: String,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    variants: [VariantSchema],
    reviews: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    topSelling: {
      type: Boolean,
      default: false,
    },
    salesCount: {
      type: Number,
      default: 0,
      min: [0, 'Sales count cannot be negative'],
    },
    in_stock: {
      type: Boolean,
      default: true,
    },
    stock_quantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Auto-generate slug from name before saving
ProductSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Create indexes
ProductSchema.index({ category_id: 1 });
// slug already has unique: true in schema definition, so no need to index again
ProductSchema.index({ name: 'text' });
ProductSchema.index({ featured: 1 });
ProductSchema.index({ active: 1 });
ProductSchema.index({ topSelling: 1 });
ProductSchema.index({ in_stock: 1 });
// Sparse index for variant SKUs - only indexes documents that have variants with SKUs
ProductSchema.index({ 'variants.sku': 1 }, { sparse: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
