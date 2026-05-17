const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const llmManager = require('../utils/llmRotation');

// Get LLM usage statistics
router.get('/llm-usage', protect, async (req, res) => {
  try {
    const stats = await llmManager.getUsageStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;