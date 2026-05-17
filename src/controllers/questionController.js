const Question = require('../models/Question');
const Session = require('../models/Session');

// @desc    Get all questions with filters
// @route   GET /api/questions
// @access  Private
exports.getQuestions = async (req, res) => {
  try {
    const {
      category,
      difficulty,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt',
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Execute query
    const questions = await Question.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get user's attempt data for each question
    const userId = req.user._id;
    const questionsWithUserData = await Promise.all(
      questions.map(async (question) => {
        // Get user's sessions for this question
        const sessions = await Session.find({
          userId,
          questionId: question._id,
          status: 'completed',
        }).sort({ completedAt: -1 });

        // Calculate personal best and times practiced
        let personalBest = 0;
        let timesPracticed = sessions.length;

        if (sessions.length > 0) {
          // Get highest overall score from all attempts across all sessions
          sessions.forEach(session => {
            session.attempts.forEach(attempt => {
              if (attempt.scores.overall > personalBest) {
                personalBest = attempt.scores.overall;
              }
            });
          });
        }

        return {
          ...question,
          userStats: {
            timesPracticed,
            personalBest: personalBest || null,
            lastPracticed: sessions[0]?.completedAt || null,
          },
        };
      })
    );

    const count = await Question.countDocuments(query);

    res.json({
      success: true,
      questions: questionsWithUserData,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single question by ID
// @route   GET /api/questions/:id
// @access  Private
exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Get user's history with this question
    const sessions = await Session.find({
      userId: req.user._id,
      questionId: question._id,
    }).sort({ startedAt: -1 });

    res.json({
      success: true,
      question,
      userHistory: sessions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create custom question
// @route   POST /api/questions
// @access  Private
exports.createQuestion = async (req, res) => {
  try {
    const { title, description, category, difficulty, tags, expectedTime } = req.body;

    // Validate required fields
    if (!title || !category || !difficulty) {
      return res.status(400).json({
        message: 'Please provide title, category, and difficulty',
      });
    }

    const question = await Question.create({
      title,
      description,
      category,
      difficulty,
      tags: tags || [],
      expectedTime: expectedTime || 120,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      question,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update custom question
// @route   PUT /api/questions/:id
// @access  Private
exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user owns this question
    if (!question.createdBy || question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized to update this question',
      });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete custom question
// @route   DELETE /api/questions/:id
// @access  Private
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user owns this question
    if (!question.createdBy || question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized to delete this question',
      });
    }

    // Soft delete (mark as inactive)
    question.isActive = false;
    await question.save();

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get smart question suggestions
// @route   GET /api/questions/suggestions
// @access  Private
exports.getSmartSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's progress
    const Progress = require('../models/Progress');
    const progress = await Progress.findOne({ userId });

    let suggestions = [];

    // Strategy 1: Questions user needs to work on (low scores)
    if (progress && progress.questionsNeedingWork.length > 0) {
      const needWorkIds = progress.questionsNeedingWork.map(q => q.questionId);
      const needWorkQuestions = await Question.find({
        _id: { $in: needWorkIds },
        isActive: true,
      }).limit(3);

      suggestions.push(...needWorkQuestions.map(q => ({
        ...q.toObject(),
        reason: 'Needs improvement - You scored below 7 on this',
      })));
    }

    // Strategy 2: Questions not practiced recently
    const recentSessions = await Session.find({ userId })
      .sort({ startedAt: -1 })
      .limit(10)
      .select('questionId');

    const recentQuestionIds = recentSessions.map(s => s.questionId.toString());

    const unpracticedQuestions = await Question.find({
      _id: { $nin: recentQuestionIds },
      isActive: true,
    }).limit(3);

    suggestions.push(...unpracticedQuestions.map(q => ({
      ...q.toObject(),
      reason: 'Not practiced recently',
    })));

    // Strategy 3: Questions in weakest area
    if (progress && progress.weakestArea) {
      // For now, just suggest random questions
      // In production, you'd tag questions with which skill they test
      const randomQuestions = await Question.aggregate([
        { $match: { isActive: true } },
        { $sample: { size: 2 } },
      ]);

      suggestions.push(...randomQuestions.map(q => ({
        ...q,
        reason: `Strengthen your ${progress.weakestArea} skills`,
      })));
    }

    // Remove duplicates
    const uniqueSuggestions = suggestions.filter(
      (q, index, self) =>
        index === self.findIndex(t => t._id.toString() === q._id.toString())
    );

    res.json({
      success: true,
      suggestions: uniqueSuggestions.slice(0, 5), // Return top 5
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get question of the day
// @route   GET /api/questions/daily
// @access  Private
exports.getQuestionOfTheDay = async (req, res) => {
  try {
    // Use date as seed for consistent daily question
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    // Get random question based on seed
    const totalQuestions = await Question.countDocuments({ isActive: true });
    const randomIndex = seed % totalQuestions;

    const question = await Question.findOne({ isActive: true })
      .skip(randomIndex)
      .limit(1);

    if (!question) {
      return res.status(404).json({ message: 'No questions available' });
    }

    res.json({
      success: true,
      question,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get categories
// @route   GET /api/questions/meta/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await Question.distinct('category', { isActive: true });

    // Get count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Question.countDocuments({ category, isActive: true });
        return { name: category, count };
      })
    );

    res.json({
      success: true,
      categories: categoriesWithCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};