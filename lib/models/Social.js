import mongoose from 'mongoose';

const SocialSchema = new mongoose.Schema(
  {
    instagram: { type: String, trim: true, default: '' },
    facebook: { type: String, trim: true, default: '' },
    tiktok: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    label: { type: String, trim: true, default: 'default' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

SocialSchema.index({ label: 1 });

export default mongoose.models.Social || mongoose.model('Social', SocialSchema);
