import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    title: { type: String, trim: true },
    body: { type: String, trim: true },
    source: { type: String, default: 'external' },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

MessageSchema.index({ email: 1 });
MessageSchema.index({ created_at: -1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
