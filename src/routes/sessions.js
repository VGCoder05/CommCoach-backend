const express = require('express');
const router = express.Router();
const {
  startSession,
  submitAnswer,
  completeSession,
  getHistory,
  getSession,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.post('/start', startSession);
router.get('/history', getHistory);

router.route('/:id')
  .get(getSession);

router.post('/:id/submit', submitAnswer);
router.patch('/:id/complete', completeSession);

module.exports = router;