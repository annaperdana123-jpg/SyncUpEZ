const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateInteraction } = require('../middleware/validationMiddleware');

/**
 * Interaction Routes
 */

// Get all interactions
router.get('/', authenticateToken, interactionController.getInteractions);

// Get interactions by employee ID
router.get('/employee/:id', authenticateToken, interactionController.getInteractionsByEmployeeId);

// Create new interaction
router.post('/', authenticateToken, validateInteraction, interactionController.createInteraction);

module.exports = router;