const express = require('express');
const router = express.Router();
const {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getSmartSuggestions,
  getQuestionOfTheDay,
  getCategories,
} = require('../controllers/questionController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .get(getQuestions)
  .post(createQuestion);

router.get('/suggestions', getSmartSuggestions);
router.get('/daily', getQuestionOfTheDay);
router.get('/meta/categories', getCategories);

router.route('/:id')
  .get(getQuestion)
  .put(updateQuestion)
  .delete(deleteQuestion);

module.exports = router;