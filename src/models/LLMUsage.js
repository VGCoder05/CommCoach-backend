const mongoose = require('mongoose');

const llmUsageSchema = new mongoose.Schema({
  providerId: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  requestCount: {
    type: Number,
    default: 0,
  },
  successCount: {
    type: Number,
    default: 0,
  },
  errorCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
llmUsageSchema.index({ providerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('LLMUsage', llmUsageSchema);