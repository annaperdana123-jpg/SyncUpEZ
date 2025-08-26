const express = require('express');
const router = express.Router();
const kudosController = require('../controllers/kudosController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateKudos } = require('../middleware/validationMiddleware');

/**
 * Kudos Routes
 */

// Get all kudos
router.get('/', authenticateToken, kudosController.getKudos);

// Get kudos for employee
router.get('/employee/:id', authenticateToken, kudosController.getKudosByEmployeeId);

// Create new kudos
router.post('/', authenticateToken, validateKudos, kudosController.createKudos);

module.exports = router;