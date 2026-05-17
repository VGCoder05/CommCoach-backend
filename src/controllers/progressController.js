const Progress = require('../models/Progress');
const Session = require('../models/Session');
const Question = require('../models/Question');

// @desc    Get user's progress overview
// @route   GET /api/progress/overview
// @access  Private
exports.getOverview = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get or create progress record
    let progress = await Progress.findOne({ userId });

    if (!progress) {
      progress = await Progress.create({ userId });
    }

    // Get additional stats
    const totalCompleted = await Session.countDocuments({
      userId,
      status: 'completed',
    });

    const totalInProgress = await Session.countDocuments({
      userId,
      status: 'in-progress',
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await Session.countDocuments({
      userId,
      startedAt: { $gte: sevenDaysAgo },
      status: 'completed',
    });

    // Calculate improvement trend (compare last 5 vs previous 5)
    const allSessions = await Session.find({
      userId,
      status: 'completed',
    }).sort({ completedAt: -1 }).limit(10);

    let improvement = 0;
    if (allSessions.length >= 10) {
      const recent5Avg = calculateAvgScore(allSessions.slice(0, 5));
      const previous5Avg = calculateAvgScore(allSessions.slice(5, 10));
      improvement = parseFloat((recent5Avg - previous5Avg).toFixed(2));
    }

    res.json({
      success: true,
      overview: {
        totalSessions: progress.totalSessions,
        totalCompleted,
        totalInProgress,
        currentStreak: req.user.currentStreak,
        avgScores: progress.avgScores,
        weakestArea: progress.weakestArea,
        recentActivity: recentSessions,
        improvement, // +0.3 means 0.3 point improvement
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get score trends over time
// @route   GET /api/progress/trends
// @access  Private
exports.getTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user._id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const sessions = await Session.find({
      userId,
      status: 'completed',
      completedAt: { $gte: startDate },
    })
      .sort({ completedAt: 1 })
      .populate('questionId', 'category');

    // Group by date and calculate daily averages
    const dailyScores = {};

    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        const date = new Date(attempt.timestamp).toISOString().split('T')[0];

        if (!dailyScores[date]) {
          dailyScores[date] = {
            date,
            vocabulary: [],
            flow: [],
            structure: [],
            overall: [],
          };
        }

        dailyScores[date].vocabulary.push(attempt.scores.vocabulary);
        dailyScores[date].flow.push(attempt.scores.flow);
        dailyScores[date].structure.push(attempt.scores.structure);
        dailyScores[date].overall.push(attempt.scores.overall);
      });
    });

    // Calculate averages for each day
    const trendData = Object.values(dailyScores).map(day => ({
      date: day.date,
      vocabulary: average(day.vocabulary),
      flow: average(day.flow),
      structure: average(day.structure),
      overall: average(day.overall),
    }));

    res.json({
      success: true,
      trends: trendData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get practice calendar (heatmap data)
// @route   GET /api/progress/calendar
// @access  Private
exports.getCalendar = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const userId = req.user._id;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const sessions = await Session.find({
      userId,
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    });

    // Count sessions per day
    const calendar = {};

    sessions.forEach(session => {
      const date = new Date(session.completedAt).toISOString().split('T')[0];
      calendar[date] = (calendar[date] || 0) + 1;
    });

    // Convert to array format
    const calendarData = Object.entries(calendar).map(([date, count]) => ({
      date,
      count,
      level: getHeatmapLevel(count), // 0-4 for color intensity
    }));

    res.json({
      success: true,
      calendar: calendarData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get detailed statistics
// @route   GET /api/progress/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Category performance
    const sessions = await Session.find({
      userId,
      status: 'completed',
    }).populate('questionId');

    const categoryStats = {};

    sessions.forEach(session => {
      const category = session.questionId.category;

      if (!categoryStats[category]) {
        categoryStats[category] = {
          category,
          count: 0,
          avgScore: 0,
          scores: [],
        };
      }

      session.attempts.forEach(attempt => {
        categoryStats[category].scores.push(attempt.scores.overall);
      });

      categoryStats[category].count = categoryStats[category].scores.length;
      categoryStats[category].avgScore = average(categoryStats[category].scores);
    });

    // Difficulty performance
    const difficultyStats = {};

    sessions.forEach(session => {
      const difficulty = session.questionId.difficulty;

      if (!difficultyStats[difficulty]) {
        difficultyStats[difficulty] = {
          difficulty,
          count: 0,
          avgScore: 0,
          scores: [],
        };
      }

      session.attempts.forEach(attempt => {
        difficultyStats[difficulty].scores.push(attempt.scores.overall);
      });

      difficultyStats[difficulty].count = difficultyStats[difficulty].scores.length;
      difficultyStats[difficulty].avgScore = average(difficultyStats[difficulty].scores);
    });

    // Top performed questions
    const questionPerformance = {};

    sessions.forEach(session => {
      const qId = session.questionId._id.toString();

      if (!questionPerformance[qId]) {
        questionPerformance[qId] = {
          question: session.questionId,
          attempts: 0,
          bestScore: 0,
          avgScore: 0,
          scores: [],
        };
      }

      session.attempts.forEach(attempt => {
        questionPerformance[qId].scores.push(attempt.scores.overall);
        if (attempt.scores.overall > questionPerformance[qId].bestScore) {
          questionPerformance[qId].bestScore = attempt.scores.overall;
        }
      });

      questionPerformance[qId].attempts = questionPerformance[qId].scores.length;
      questionPerformance[qId].avgScore = average(questionPerformance[qId].scores);
    });

    const topQuestions = Object.values(questionPerformance)
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 5);

    const strugglingQuestions = Object.values(questionPerformance)
      .filter(q => q.avgScore < 7)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 5);

    res.json({
      success: true,
      stats: {
        byCategory: Object.values(categoryStats),
        byDifficulty: Object.values(difficultyStats),
        topQuestions,
        strugglingQuestions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get questions needing work
// @route   GET /api/progress/needs-work
// @access  Private
exports.getNeedsWork = async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user._id })
      .populate('questionsNeedingWork.questionId');

    if (!progress || progress.questionsNeedingWork.length === 0) {
      return res.json({
        success: true,
        questions: [],
      });
    }

    // Sort by lowest score
    const sortedQuestions = progress.questionsNeedingWork
      .sort((a, b) => a.avgScore - b.avgScore)
      .map(item => ({
        question: item.questionId,
        avgScore: item.avgScore,
      }));

    res.json({
      success: true,
      questions: sortedQuestions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper functions
function average(arr) {
  if (arr.length === 0) return 0;
  return parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
}

function calculateAvgScore(sessions) {
  const scores = [];
  sessions.forEach(session => {
    session.attempts.forEach(attempt => {
      scores.push(attempt.scores.overall);
    });
  });
  return average(scores);
}

function getHeatmapLevel(count) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}