const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * Analytics Routes
 */

// Get metrics for specific employee
router.get('/employees/:id', authenticateToken, analyticsController.getEmployeeAnalytics);

// Get historical score trends for employee
router.get('/employees/:id/history', authenticateToken, analyticsController.getEmployeeHistory);

// Get metrics for specific team
router.get('/teams/:teamId', authenticateToken, analyticsController.getTeamAnalytics);

// Get metrics for specific department
router.get('/departments/:deptId', authenticateToken, analyticsController.getDepartmentAnalytics);

// Get overall statistics
router.get('/stats', authenticateToken, analyticsController.getStats);

// Get top contributors
router.get('/top-contributors', authenticateToken, analyticsController.getTopContributors);

module.exports = router;