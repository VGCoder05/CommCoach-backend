const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  attemptNumber: {
    type: Number,
    required: true,
  },
  rawAnswer: {
    type: String,
    required: true,
  },
  scores: {
    vocabulary: { type: Number, min: 0, max: 10 },
    flow: { type: Number, min: 0, max: 10 },
    structure: { type: Number, min: 0, max: 10 },
    overall: { type: Number, min: 0, max: 10 },
  },
  diagnosisData: {
    vocabulary: {
      score: Number,
      weakWords: [{
        original: String,
        better: String,
        reason: String,
        originalSentence: String,
        improvedSentence: String,
      }],
    },
    flow: {
      score: Number,
      gaps: [String],
      transitions: [{
        missing: String,
        suggestion: String,
        position: String,
      }],
    },
    structure: {
      score: Number,
      define: { present: Boolean, feedback: String },
      explain: { present: Boolean, feedback: String },
      contrast: { present: Boolean, feedback: String },
    },
    finalAnswer: String,
    biggestWeakness: String,
  },
  llmProvider: String, // Which API was used
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  attempts: [attemptSchema],
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
});

// Calculate overall score from last attempt
sessionSchema.virtual('latestScore').get(function () {
  if (this.attempts.length === 0) return 0;
  const lastAttempt = this.attempts[this.attempts.length - 1];
  return lastAttempt.scores.overall;
});

module.exports = mongoose.model('Session', sessionSchema);