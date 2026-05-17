const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  totalSessions: {
    type: Number,
    default: 0,
  },
  avgScores: {
    vocabulary: { type: Number, default: 0 },
    flow: { type: Number, default: 0 },
    structure: { type: Number, default: 0 },
    overall: { type: Number, default: 0 },
  },
  scoreHistory: [{
    date: Date,
    vocabulary: Number,
    flow: Number,
    structure: Number,
    overall: Number,
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
  }],
  weakestArea: {
    type: String,
    enum: ['vocabulary', 'flow', 'structure'],
  },
  questionsNeedingWork: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    avgScore: Number,
  }],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Progress', progressSchema);