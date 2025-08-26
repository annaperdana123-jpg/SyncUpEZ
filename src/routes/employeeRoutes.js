const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateEmployeeId } = require('../middleware/validationMiddleware');

/**
 * Employee Routes
 */

// Get all employees
router.get('/', authenticateToken, employeeController.getEmployees);

// Get employee by ID
router.get('/:id', authenticateToken, validateEmployeeId, employeeController.getEmployeeById);

// Create new employee (no authentication needed for creation)
router.post('/', employeeController.createEmployee);

module.exports = router;