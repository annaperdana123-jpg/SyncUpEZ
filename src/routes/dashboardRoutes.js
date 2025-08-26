const express = require('express');
const router = express.Router();
const { 
  getAdminDashboard,
  getTenantDashboard
} = require('../controllers/dashboardController');

// Get admin dashboard (all tenants)
router.get('/admin', getAdminDashboard);

// Get tenant dashboard (current tenant)
router.get('/tenant', getTenantDashboard);

module.exports = router;