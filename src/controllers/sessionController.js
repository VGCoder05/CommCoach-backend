const Session = require('../models/Session');
const Question = require('../models/Question');
const Progress = require('../models/Progress');
const User = require('../models/User');
const llmManager = require('../utils/llmRotation');
const { createDiagnosisPrompt } = require('../utils/promptTemplates');

// @desc    Start new practice session
// @route   POST /api/sessions/start
// @access  Private
exports.startSession = async (req, res) => {
  try {
    const { questionId } = req.body;

    // Validate question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Create new session
    const session = await Session.create({
      userId: req.user._id,
      questionId,
      attempts: [],
    });

    // Increment question attempt count
    question.timesAttempted += 1;
    await question.save();

    res.status(201).json({
      success: true,
      session: {
        _id: session._id,
        questionId: session.questionId,
        status: session.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit answer and get AI diagnosis
// @route   POST /api/sessions/:id/submit
// @access  Private
exports.submitAnswer = async (req, res) => {
  try {
    const { rawAnswer } = req.body;
    const sessionId = req.params.id;

    // Find session
    const session = await Session.findById(sessionId).populate('questionId');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify ownership
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get question details
    const question = session.questionId;

    // Create prompt for LLM
    const prompt = createDiagnosisPrompt(question.title, rawAnswer);

    // Call LLM with rotation
    console.log('🔄 Requesting AI diagnosis...');
    const { data: diagnosisData, provider } = await llmManager.callLLM(prompt);

    // Calculate scores
    const scores = {
      vocabulary: diagnosisData.vocabulary.score,
      flow: diagnosisData.flow.score,
      structure: diagnosisData.structure.score,
      overall: diagnosisData.overallScore,
    };

    // Create attempt object
    const attempt = {
      attemptNumber: session.attempts.length + 1,
      rawAnswer,
      scores,
      diagnosisData,
      llmProvider: provider,
    };

    // Add attempt to session
    session.attempts.push(attempt);
    await session.save();

    // Update user's progress
    await updateUserProgress(req.user._id, session, scores);

    res.json({
      success: true,
      attempt,
      provider, // Which LLM was used
    });
  } catch (error) {
    console.error('Diagnosis error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark session as complete
// @route   PATCH /api/sessions/:id/complete
// @access  Private
exports.completeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Update user streak
    await updateStreak(req.user._id);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get session history
// @route   GET /api/sessions/history
// @access  Private
exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, status } = req.query;

    const query = { userId: req.user._id };
    
    if (status) query.status = status;

    const sessions = await Session.find(query)
      .populate('questionId')
      .sort({ startedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Session.countDocuments(query);

    res.json({
      success: true,
      sessions,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single session detail
// @route   GET /api/sessions/:id
// @access  Private
exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('questionId');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper: Update user progress
async function updateUserProgress(userId, session, scores) {
  let progress = await Progress.findOne({ userId });

  if (!progress) {
    progress = await Progress.create({ userId });
  }

  // Increment session count
  progress.totalSessions += 1;

  // Update average scores
  const total = progress.totalSessions;
  progress.avgScores.vocabulary = 
    ((progress.avgScores.vocabulary * (total - 1)) + scores.vocabulary) / total;
  progress.avgScores.flow = 
    ((progress.avgScores.flow * (total - 1)) + scores.flow) / total;
  progress.avgScores.structure = 
    ((progress.avgScores.structure * (total - 1)) + scores.structure) / total;
  progress.avgScores.overall = 
    ((progress.avgScores.overall * (total - 1)) + scores.overall) / total;

  // Add to score history
  progress.scoreHistory.push({
    date: new Date(),
    ...scores,
    sessionId: session._id,
  });

  // Determine weakest area
  const scoreMap = [
    { area: 'vocabulary', score: scores.vocabulary },
    { area: 'flow', score: scores.flow },
    { area: 'structure', score: scores.structure },
  ];
  progress.weakestArea = scoreMap.sort((a, b) => a.score - b.score)[0].area;

  // Update questions needing work
  if (scores.overall < 7) {
    const existing = progress.questionsNeedingWork.find(
      q => q.questionId.toString() === session.questionId.toString()
    );

    if (existing) {
      existing.avgScore = (existing.avgScore + scores.overall) / 2;
    } else {
      progress.questionsNeedingWork.push({
        questionId: session.questionId,
        avgScore: scores.overall,
      });
    }
  }

  progress.lastUpdated = new Date();
  await progress.save();
}

// Helper: Update practice streak
async function updateStreak(userId) {
  const user = await User.findById(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!user.lastPracticeDate) {
    user.currentStreak = 1;
  } else {
    const lastPractice = new Date(user.lastPracticeDate);
    lastPractice.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - lastPractice) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.currentStreak += 1;
    } else if (diffDays > 1) {
      user.currentStreak = 1;
    }
  }

  user.lastPracticeDate = new Date();
  await user.save();
}