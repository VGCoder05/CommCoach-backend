const express = require('express');
const router = express.Router();
const {
  getOverview,
  getTrends,
  getCalendar,
  getStats,
  getNeedsWork,
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/overview', getOverview);
router.get('/trends', getTrends);
router.get('/calendar', getCalendar);
router.get('/stats', getStats);
router.get('/needs-work', getNeedsWork);

module.exports = router;