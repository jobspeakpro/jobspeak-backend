const express = require('express');
const router = express.Router();

/**
 * GET /api/qa-mode
 * Returns whether QA mode is enabled based on backend environment variable
 */
router.get('/api/qa-mode', (req, res) => {
    const enabled = process.env.MOCK_INTERVIEW_QA_MODE === 'true';
    console.log('[QA-MODE] Endpoint called, enabled:', enabled);
    res.json({ enabled });
});

module.exports = router;
