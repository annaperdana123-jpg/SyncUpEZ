const express = require('express');
const router = express.Router();
const contributionController = require('../controllers/contributionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateContributionScores } = require('../middleware/validationMiddleware');

/**
 * Contribution Routes
 */

// Get all contribution scores
router.get('/', authenticateToken, contributionController.getContributions);

// Get contribution scores for employee
router.get('/employee/:id', authenticateToken, contributionController.getContributionsByEmployeeId);

// Add contribution scores
router.post('/', authenticateToken, validateContributionScores, contributionController.addContributionScores);

module.exports = router;