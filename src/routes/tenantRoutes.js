const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

/**
 * Tenant Management Routes
 */

// Create a new tenant
router.post('/', tenantController.createTenant);

// Get tenant information
router.get('/:id', tenantController.getTenant);

// List all tenants
router.get('/', tenantController.getAllTenants);

// Delete a tenant
router.delete('/:id', tenantController.removeTenant);

module.exports = router;