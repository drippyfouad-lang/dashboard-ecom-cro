import mongoose from 'mongoose';

/**
 * User Activity Schema
 * Tracks all user actions within the dashboard for audit and analytics
 */
const UserActivitySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action_type: {
      type: String,
      required: true,
      enum: [
        'login',
        'logout',
        'create',
        'update',
        'delete',
        'view',
        'upload',
        'download',
        'export',
        'navigation',
      ],
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true, // e.g., 'product', 'order', 'user', 'category'
    },
    resource_id: {
      type: String, // ID of the resource affected
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Additional context
    },
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
UserActivitySchema.index({ user_id: 1, timestamp: -1 });
UserActivitySchema.index({ action_type: 1, timestamp: -1 });
UserActivitySchema.index({ resource: 1, timestamp: -1 });

export default mongoose.models.UserActivity || mongoose.model('UserActivity', UserActivitySchema);
