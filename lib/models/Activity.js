import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    user_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    user_name: {
      type: String,
      trim: true,
      default: '',
    },
    action_type: {
      type: String,
      enum: [
        'view',
        'create',
        'update',
        'delete',
        'export',
        'login',
        'logout',
        'status_change',
        'payment_update',
        'upload',
        'download',
      ],
      required: [true, 'Action type is required'],
    },
    resource: {
      type: String,
      enum: [
        'order',
        'product',
        'category',
        'user',
        'customer',
        'shipping',
        'wilaya',
        'commune',
        'finance',
        'dashboard',
        'settings',
      ],
      required: [true, 'Resource is required'],
    },
    resource_id: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    entity_name: {
      type: String,
      trim: true,
      default: '',
    },
    ip_address: {
      type: String,
      default: null,
    },
    user_agent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Create indexes for better query performance
ActivitySchema.index({ user_id: 1 });
ActivitySchema.index({ action_type: 1 });
ActivitySchema.index({ resource: 1 });
ActivitySchema.index({ created_at: -1 });
ActivitySchema.index({ user_email: 1 });
ActivitySchema.index({ entity_name: 1 });

// Force delete cached model to ensure schema updates
if (mongoose.models.Activity) {
  delete mongoose.models.Activity;
}

export default mongoose.model('Activity', ActivitySchema);
