import mongoose from 'mongoose';

const ContactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'contact_messages', // Explicitly set collection name
  }
);

// Create indexes
ContactMessageSchema.index({ email: 1 });
ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ status: 1 });
ContactMessageSchema.index({ read: 1 });

export default mongoose.models.ContactMessage || mongoose.model('ContactMessage', ContactMessageSchema);
