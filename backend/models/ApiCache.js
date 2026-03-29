import mongoose from 'mongoose';

const cacheSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  data:      { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true },
});

// MongoDB auto-deletes documents once expiresAt is reached
cacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.ApiCache ||
  mongoose.model('ApiCache', cacheSchema);