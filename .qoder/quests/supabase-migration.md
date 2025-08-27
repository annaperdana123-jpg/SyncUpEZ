# Supabase Migration: Replacing CSV Implementations

## Overview

This document outlines the comprehensive migration of SyncUpEZ from CSV-based storage to Supabase PostgreSQL database. The migration involves replacing all CSV file operations with Supabase database operations while maintaining the existing API contracts and multi-tenancy features.

The migration affects the following components of the application:
1. **Data Access Layer**: Replacing CSV utilities with Supabase repositories
2. **Business Logic Layer**: Updating services to use repositories instead of direct CSV operations
3. **Controllers**: Removing CSV utility imports and using repositories through services
4. **Tenant Management**: Migrating tenant provisioning from file system to database
5. **Backup Functionality**: Updating backup mechanisms to work with database instead of files
6. **Data Isolation**: Using Supabase Row Level Security instead of directory-based isolation

## Architecture

### Current Architecture (CSV-based)
```
[Client] → [Express Routes] → [Controllers] → [Services] → [CSV Utils] → [File System]
                                    ↑
                              [Middlewares]
```

### Target Architecture (Supabase)
```
[Client] → [Express Routes] → [Controllers] → [Services] → [Repositories] → [Supabase Client]
                                    ↑
                              [Middlewares]
```

### Key Changes
1. Replace CSV utility functions with Supabase repository pattern
2. Update services to use repositories instead of direct CSV operations
3. Maintain existing controller interfaces
4. Preserve multi-tenancy through Row Level Security (RLS)

## Data Models & Database Schema

### employees
- id (UUID, primary key)
- tenant_id (TEXT)
- employee_id (TEXT)
- name (TEXT)
- email (TEXT)
- password (TEXT)
- department (TEXT, optional)
- team (TEXT, optional)
- role (TEXT, optional)
- hire_date (DATE, optional)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### interactions
- id (UUID, primary key)
- tenant_id (TEXT)
- from_employee_id (TEXT)
- to_employee_id (TEXT)
- interaction_type (TEXT)
- content (TEXT)
- timestamp (TIMESTAMP)
- created_at (TIMESTAMP)

### kudos
- id (UUID, primary key)
- tenant_id (TEXT)
- from_employee_id (TEXT)
- to_employee_id (TEXT)
- message (TEXT)
- timestamp (TIMESTAMP)
- created_at (TIMESTAMP)

### contributions
- id (UUID, primary key)
- tenant_id (TEXT)
- employee_id (TEXT)
- problem_solving_score (NUMERIC)
- collaboration_score (NUMERIC)
- initiative_score (NUMERIC)
- overall_score (NUMERIC)
- calculated_at (TIMESTAMP)
- created_at (TIMESTAMP)

### tenants
- id (TEXT, primary key)
- name (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Components to Migrate

### 1. Employee Management
**Current Implementation**: Uses `employeeRepository.js` with Supabase (already migrated)
**Migration Status**: COMPLETE

### 2. Interaction Management
**Current Implementation**: Uses CSV utilities in `interactionController.js`
**Migration Required**: 
- Create `interactionRepository.js` with Supabase operations
- Update `interactionController.js` to use repository
- Remove CSV utility imports

### 3. Kudos Management
**Current Implementation**: Uses CSV utilities in `kudosController.js`
**Migration Required**: 
- Create `kudosRepository.js` with Supabase operations
- Update `kudosController.js` to use repository
- Remove CSV utility imports

### 4. Analytics Services
**Current Implementation**: Direct CSV reads in `analyticsService.js`
**Migration Required**: 
- Update `analyticsService.js` to use repositories
- Remove direct CSV utility imports

### 5. Contribution Management
**Current Implementation**: Direct CSV operations in services
**Migration Required**: 
- Create `contributionRepository.js` with Supabase operations
- Update scoring services to use repository
- Remove CSV utility imports

### Updated Scoring Service
```javascript
// src/services/scoringService.js (after migration)
// No longer needs CSV imports since data will be passed in

/**
 * Contribution Scoring Service
 * Implements algorithms for measuring problem-solving, collaboration, and initiative
 */

/**
 * Problem-Solving Detection Algorithm
 * @param {string} content - Interaction content to analyze
 * @returns {number} - Problem-solving score (0-100)
 */
function calculateProblemSolvingScore(content) {
  if (!content) return 0;
  
  const lowerContent = content.toLowerCase();
  
  // Keywords for problem-solving
  const problemKeywords = [
    'problem', 'issue', 'solution', 'resolve', 'fix', 'debug', 'troubleshoot',
    'error', 'bug', 'challenge', 'difficulty', 'obstacle'
  ];
  
  // Count questions vs answers
  const questionKeywords = ['how', 'what', 'why', 'can you', 'could you', 'would you'];
  const answerKeywords = [
    'should', 'could', 'can', 'will', 'i suggest', 'i recommend', 
    'try', 'use', 'implement', 'solution', 'answer'
  ];
  
  // Count problem-solving keywords
  let problemKeywordCount = 0;
  problemKeywords.forEach(keyword => {
    problemKeywordCount += (lowerContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
  });
  
  // Count questions
  let questionCount = 0;
  questionKeywords.forEach(keyword => {
    questionCount += (lowerContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
  });
  
  // Count answers
  let answerCount = 0;
  answerKeywords.forEach(keyword => {
    answerCount += (lowerContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
  });
  
  // Calculate score: (answers_count / (questions_count + answers_count)) * 100
  // But also consider problem-solving keywords
  let score = 0;
  if (questionCount + answerCount > 0) {
    score = (answerCount / (questionCount + answerCount)) * 70; // 70% weight for Q&A ratio
  }
  
  // Add 30% weight for problem-solving keywords
  score += Math.min(problemKeywordCount * 5, 30);
  
  return Math.min(Math.round(score), 100);
}

/**
 * Collaboration Measurement Algorithm
 * @param {Array} employeeKudos - Kudos received by the employee
 * @param {Array} allEmployees - All employees in the system
 * @returns {number} - Collaboration score (0-100)
 */
function calculateCollaborationScore(employeeKudos, allEmployees) {
  if (!employeeKudos || employeeKudos.length === 0) return 0;
  
  // Get unique senders of kudos
  const uniqueSenders = [...new Set(employeeKudos.map(k => k.from_employee_id))];
  
  // Identify kudos from different teams/departments
  let crossFunctionalKudos = 0;
  
  // Get employee's team/department
  const employee = allEmployees.find(emp => emp.employee_id === employeeKudos[0].to_employee_id);
  if (employee) {
    employeeKudos.forEach(kudos => {
      const sender = allEmployees.find(emp => emp.employee_id === kudos.from_employee_id);
      if (sender && (sender.team !== employee.team || sender.department !== employee.department)) {
        crossFunctionalKudos++;
      }
    });
  }
  
  // Score calculation: (unique_senders_count * 10) + (cross_functional_kudos * 20), capped at 100
  const uniqueSendersScore = Math.min(uniqueSenders.length * 10, 70); // Max 70 points
  const crossFunctionalScore = Math.min(crossFunctionalKudos * 20, 30); // Max 30 points
  
  return Math.min(uniqueSendersScore + crossFunctionalScore, 100);
}

/**
 * Initiative Detection Algorithm
 * @param {string} content - Interaction content to analyze
 * @returns {number} - Initiative score (0-100)
 */
function calculateInitiativeScore(content) {
  if (!content) return 0;
  
  const lowerContent = content.toLowerCase();
  
  // Keywords for initiative
  const initiativeKeywords = [
    'proposal', 'idea', 'suggestion', 'initiative', 'started', 'created', 'built',
    'developed', 'launched', 'proposed', 'suggested', 'implemented', 'designed'
  ];
  
  // Count initiative keywords
  let initiativeKeywordCount = 0;
  initiativeKeywords.forEach(keyword => {
    initiativeKeywordCount += (lowerContent.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
  });
  
  // Identify proactive language patterns
  const proactivePhrases = [
    'i will', 'i am going to', 'i plan to', 'let me', 'i suggest', 
    'i propose', 'i recommend', 'i have started', 'i have created'
  ];
  
  let proactiveCount = 0;
  proactivePhrases.forEach(phrase => {
    proactiveCount += (lowerContent.match(new RegExp(phrase, 'g')) || []).length;
  });
  
  // Score calculation: (initiative_keywords_count * 5) + (proactive_count * 10), capped at 100
  const keywordScore = Math.min(initiativeKeywordCount * 5, 60); // Max 60 points
  const proactiveScore = Math.min(proactiveCount * 10, 40); // Max 40 points
  
  return Math.min(keywordScore + proactiveScore, 100);
}

/**
 * Calculate overall contribution score
 * @param {number} problemSolvingScore - Problem-solving score
 * @param {number} collaborationScore - Collaboration score
 * @param {number} initiativeScore - Initiative score
 * @returns {number} - Overall score (0-100)
 */
function calculateOverallScore(problemSolvingScore, collaborationScore, initiativeScore) {
  // Weighted average: 40% problem-solving, 30% collaboration, 30% initiative
  return Math.round(
    problemSolvingScore * 0.4 +
    collaborationScore * 0.3 +
    initiativeScore * 0.3
  );
}

module.exports = {
  calculateProblemSolvingScore,
  calculateCollaborationScore,
  calculateInitiativeScore,
  calculateOverallScore
};
```

### 6. Backup Functionality
**Current Implementation**: Uses CSV utilities in `backupController.js` and `backupUtils.js`
**Migration Required**: 
- Update backup utilities to export Supabase data
- Modify backup controller to use Supabase export functionality
- Implement data import functionality for restores

### 7. Tenant Management
**Current Implementation**: Uses file system operations in `tenantService.js`
**Migration Required**: 
- Update tenant service to work with Supabase tenant table
- Remove file system operations for tenant provisioning

### 8. Data Isolation Middleware
**Current Implementation**: Uses file system operations in `dataIsolationMiddleware.js`
**Migration Required**: 
- Update middleware to work with Supabase RLS instead of directory-based isolation

### Backup Repository
```javascript
// src/repositories/backupRepository.js
const supabase = require('../utils/supabaseClient');

async function exportTenantData(tenantId) {
  // Export all tenant data as JSON
  const data = {};
  
  // Export employees
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('*')
    .eq('tenant_id', tenantId);
  
  if (employeesError) throw new Error(`Failed to export employees: ${employeesError.message}`);
  data.employees = employees;
  
  // Export interactions
  const { data: interactions, error: interactionsError } = await supabase
    .from('interactions')
    .select('*')
    .eq('tenant_id', tenantId);
  
  if (interactionsError) throw new Error(`Failed to export interactions: ${interactionsError.message}`);
  data.interactions = interactions;
  
  // Export kudos
  const { data: kudos, error: kudosError } = await supabase
    .from('kudos')
    .select('*')
    .eq('tenant_id', tenantId);
  
  if (kudosError) throw new Error(`Failed to export kudos: ${kudosError.message}`);
  data.kudos = kudos;
  
  // Export contributions
  const { data: contributions, error: contributionsError } = await supabase
    .from('contributions')
    .select('*')
    .eq('tenant_id', tenantId);
  
  if (contributionsError) throw new Error(`Failed to export contributions: ${contributionsError.message}`);
  data.contributions = contributions;
  
  return data;
}

async function importTenantData(tenantId, data) {
  // Import tenant data from JSON
  
  // Import employees
  if (data.employees && data.employees.length > 0) {
    const employeesWithTenantId = data.employees.map(emp => ({
      ...emp,
      tenant_id: tenantId
    }));
    
    const { error: employeesError } = await supabase
      .from('employees')
      .upsert(employeesWithTenantId);
    
    if (employeesError) throw new Error(`Failed to import employees: ${employeesError.message}`);
  }
  
  // Import interactions
  if (data.interactions && data.interactions.length > 0) {
    const interactionsWithTenantId = data.interactions.map(int => ({
      ...int,
      tenant_id: tenantId
    }));
    
    const { error: interactionsError } = await supabase
      .from('interactions')
      .upsert(interactionsWithTenantId);
    
    if (interactionsError) throw new Error(`Failed to import interactions: ${interactionsError.message}`);
  }
  
  // Import kudos
  if (data.kudos && data.kudos.length > 0) {
    const kudosWithTenantId = data.kudos.map(k => ({
      ...k,
      tenant_id: tenantId
    }));
    
    const { error: kudosError } = await supabase
      .from('kudos')
      .upsert(kudosWithTenantId);
    
    if (kudosError) throw new Error(`Failed to import kudos: ${kudosError.message}`);
  }
  
  // Import contributions
  if (data.contributions && data.contributions.length > 0) {
    const contributionsWithTenantId = data.contributions.map(cont => ({
      ...cont,
      tenant_id: tenantId
    }));
    
    const { error: contributionsError } = await supabase
      .from('contributions')
      .upsert(contributionsWithTenantId);
    
    if (contributionsError) throw new Error(`Failed to import contributions: ${contributionsError.message}`);
  }
  
  return true;
}

module.exports = {
  exportTenantData,
  importTenantData
};
```

### Tenant Repository
```javascript
// src/repositories/tenantRepository.js
const supabase = require('../utils/supabaseClient');

async function createTenant(tenantId, tenantData) {
  const { data, error } = await supabase
    .from('tenants')
    .insert([{ 
      id: tenantId,
      name: tenantData.name || tenantId
    }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

async function getTenantById(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

async function listTenants() {
  const { data, error } = await supabase
    .from('tenants')
    .select('*');
  
  if (error) throw new Error(error.message);
  return data;
}

async function deleteTenant(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

module.exports = {
  createTenant,
  getTenantById,
  listTenants,
  deleteTenant
};
```

### Contribution Repository
```javascript
// src/repositories/contributionRepository.js
const supabase = require('../utils/supabaseClient');

async function getContributionsByEmployeeId(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .order('calculated_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data;
}

async function createContribution(tenantId, contributionData) {
  const { data, error } = await supabase
    .from('contributions')
    .insert([{ 
      ...contributionData, 
      tenant_id: tenantId
    }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

async function getLatestContribution(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .order('calculated_at', { ascending: false })
    .limit(1);
  
  if (error) throw new Error(error.message);
  return data[0] || null;
}

module.exports = {
  getContributionsByEmployeeId,
  createContribution,
  getLatestContribution
};
```

## Migration Plan

### Phase 1: Repository Layer Implementation
1. Create repositories for each entity:
   - `interactionRepository.js`
   - `kudosRepository.js`
   - `contributionRepository.js`
   - `backupRepository.js`
2. Implement all CRUD operations using Supabase client
3. Add proper error handling and logging

### Phase 2: Service Layer Updates
1. Update services to use new repositories:
   - `analyticsService.js`
   - `scoringService.js`
2. Remove direct CSV utility calls
3. Maintain existing function signatures

### Phase 3: Controller Updates
1. Update controllers to remove CSV utility imports:
   - `interactionController.js`
   - `kudosController.js`
   - `contributionController.js`
2. Ensure tenant context is properly passed to repositories

### Phase 4: Backup Functionality Updates
1. Create backup repository with export/import functionality
2. Update backup service to use Supabase export instead of CSV copying
3. Modify backup controller to use new backup service
4. Implement data import functionality for restores

### Phase 5: Tenant Management Updates
1. Update tenant service to work with Supabase tenant table
2. Remove file system operations for tenant provisioning
3. Update data isolation middleware to work with Supabase RLS

### Phase 6: Cleanup
1. Remove unused CSV utility functions
   - `src/utils/csvReader.js`
   - `src/utils/csvWriter.js`
   - `src/utils/tenantCsvUtils.js`
2. Remove tenant CSV utilities
3. Update documentation and tests
4. Remove data directory structure that was used for CSV files
5. Update package.json to remove any CSV-related dependencies (if any)

## Detailed Implementation

### Updated Analytics Service
```javascript
// src/services/analyticsService.js (after migration)
const employeeRepository = require('../repositories/employeeRepository');
const interactionRepository = require('../repositories/interactionRepository');
const kudosRepository = require('../repositories/kudosRepository');
const contributionRepository = require('../repositories/contributionRepository');
const logger = require('../utils/logger');

async function getEmployeeMetrics(employeeId, tenantId) {
  try {
    // Get employee data
    const employee = await employeeRepository.getEmployeeById(tenantId, employeeId);
    
    // Get latest contribution scores
    const latestContribution = await contributionRepository.getLatestContribution(tenantId, employeeId);
    
    const result = {
      employee_id: employee.employee_id,
      name: employee.name,
      current_scores: latestContribution ? {
        problem_solving_score: parseInt(latestContribution.problem_solving_score),
        collaboration_score: parseInt(latestContribution.collaboration_score),
        initiative_score: parseInt(latestContribution.initiative_score),
        overall_score: parseInt(latestContribution.overall_score)
      } : {
        problem_solving_score: 0,
        collaboration_score: 0,
        initiative_score: 0,
        overall_score: 0
      },
      team: employee.team,
      department: employee.department
    };
    
    return result;
  } catch (error) {
    logger.error('Failed to get employee metrics', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getEmployeeMetrics',
      employeeId,
      tenantId
    });
    throw new Error(`Failed to get employee metrics: ${error.message}`);
  }
}

// Similar updates for other functions in the service...
```

### Updated Backup Service
```javascript
// src/services/backupService.js (after migration)
const backupRepository = require('../repositories/backupRepository');
const logger = require('../utils/logger');

// Store backup schedule reference
let backupSchedule = null;

/**
 * Create backups for all data for a specific tenant
 * @param {string} tenantId - Tenant identifier
 * @returns {Object} - Backup results
 */
async function createTenantBackups(tenantId) {
  try {
    logger.info('Starting backup process for tenant data', { tenantId });
    
    // Export tenant data
    const tenantData = await backupRepository.exportTenantData(tenantId);
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tenant-${tenantId}-backup-${timestamp}.json`;
    const backupFilePath = path.join(__dirname, `../../backups/${backupFileName}`);
    
    fs.writeFileSync(backupFilePath, JSON.stringify(tenantData, null, 2));
    
    // Calculate checksum for integrity verification
    const checksum = calculateFileChecksum(backupFilePath);
    
    // Get file stats
    const stats = fs.statSync(backupFilePath);
    
    const backupInfo = {
      tenantId: tenantId,
      backupFile: backupFilePath,
      fileName: backupFileName,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      checksum: checksum
    };
    
    // Cleanup old backups
    try {
      const deletedCount = await cleanupOldBackups(7); // Keep backups for 7 days
      logger.info('Old backups cleaned up', { deletedCount, tenantId });
    } catch (error) {
      logger.error('Failed to cleanup old backups', { error: error.message, tenantId });
    }
    
    logger.info('Backup process completed for tenant', { tenantId });
    
    return { success: true, backupInfo };
  } catch (error) {
    logger.error('Backup process failed for tenant', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    return { success: false, error: error.message };
  }
}

// Similar updates for other functions in the service...
```

### Updated Backup Controller
```javascript
// src/controllers/backupController.js (after migration)
const { createTenantBackups } = require('../services/backupService');
const backupRepository = require('../repositories/backupRepository');
const logger = require('../utils/logger');

/**
 * Create manual backup for current tenant
 */
async function createBackup(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    logger.info('Manual backup requested for tenant', { tenantId });
    
    const result = await createTenantBackups(tenantId);
    
    if (result.success) {
      logger.info('Manual backup completed for tenant', { tenantId });
      
      res.status(200).json({
        message: 'Backup process completed',
        tenantId,
        backupInfo: result.backupInfo
      });
    } else {
      logger.error('Manual backup failed for tenant', { 
        error: result.error,
        tenantId
      });
      res.status(500).json({ 
        error: 'Backup process failed',
        message: result.error 
      });
    }
  } catch (error) {
    logger.error('Manual backup failed for tenant', { 
      error: error.message, 
      stack: error.stack,
      tenantId: req.tenantId
    });
    res.status(500).json({ 
      error: 'Backup process failed',
      message: error.message 
    });
  }
}

/**
 * Restore from backup (tenant-aware)
 */
async function restoreBackup(req, res) {
  try {
    const { backupFileName } = req.body;
    const tenantId = req.tenantId || 'default';
    
    logger.info('Backup restoration requested', { 
      backupFileName, 
      tenantId 
    });
    
    // Validate input
    if (!backupFileName) {
      logger.warn('Missing backup file name for restoration', { tenantId });
      return res.status(400).json({ 
        error: 'Missing backup file name',
        message: 'backupFileName is required'
      });
    }
    
    // Construct file path
    const backupFilePath = path.join(__dirname, '../../backups', backupFileName);
    
    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    
    // Import data
    await backupRepository.importTenantData(tenantId, backupData);
    
    logger.info('Backup restoration completed', { 
      backupFileName, 
      tenantId 
    });
    
    res.status(200).json({
      message: 'Backup restored successfully',
      tenantId,
      backupFileName
    });
  } catch (error) {
    logger.error('Backup restoration failed', { 
      error: error.message, 
      stack: error.stack,
      tenantId: req.tenantId
    });
    res.status(500).json({ 
      error: 'Backup restoration failed',
      message: error.message 
    });
  }
}
```

### Updated Tenant Service
```javascript
// src/services/tenantService.js (after migration)
const tenantRepository = require('../repositories/tenantRepository');
const logger = require('../utils/logger');

/**
 * Provision a new tenant
 * @param {string} tenantId - Unique identifier for the tenant
 * @param {Object} tenantData - Additional tenant data (name, contact, etc.)
 * @returns {Promise<Object>} - Result of provisioning operation
 */
async function provisionTenant(tenantId, tenantData = {}) {
  try {
    logger.info('Provisioning new tenant', { tenantId, tenantData });
    
    // Validate tenant ID
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new Error('Invalid tenant ID');
    }
    
    // Check if tenant already exists
    try {
      await tenantRepository.getTenantById(tenantId);
      logger.warn('Tenant already exists', { tenantId });
      throw new Error(`Tenant ${tenantId} already exists`);
    } catch (error) {
      // If tenant doesn't exist, we can proceed
      if (!error.message.includes('not found')) {
        throw error;
      }
    }
    
    // Create tenant in database
    const tenant = await tenantRepository.createTenant(tenantId, tenantData);
    
    logger.info('Tenant provisioned successfully', { tenantId });
    
    return {
      success: true,
      tenantId,
      message: 'Tenant provisioned successfully',
      tenant
    };
  } catch (error) {
    logger.error('Failed to provision tenant', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    
    throw new Error(`Failed to provision tenant ${tenantId}: ${error.message}`);
  }
}

/**
 * Get tenant information
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} - Tenant information
 */
async function getTenantInfo(tenantId) {
  try {
    const tenant = await tenantRepository.getTenantById(tenantId);
    return tenant;
  } catch (error) {
    logger.error('Failed to get tenant info', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    
    throw new Error(`Failed to get tenant info for ${tenantId}: ${error.message}`);
  }
}

/**
 * List all tenants
 * @returns {Promise<Array>} - List of tenant IDs
 */
async function listTenants() {
  try {
    const tenants = await tenantRepository.listTenants();
    logger.debug('Listed tenants', { count: tenants.length });
    
    return tenants;
  } catch (error) {
    logger.error('Failed to list tenants', { 
      error: error.message, 
      stack: error.stack
    });
    
    throw new Error(`Failed to list tenants: ${error.message}`);
  }
}

/**
 * Delete a tenant (use with caution)
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} - Result of deletion operation
 */
async function deleteTenant(tenantId) {
  try {
    logger.warn('Deleting tenant (use with caution)', { tenantId });
    
    const tenant = await tenantRepository.deleteTenant(tenantId);
    
    logger.info('Tenant deleted successfully', { tenantId });
    
    return {
      success: true,
      tenantId,
      message: 'Tenant deleted successfully',
      tenant
    };
  } catch (error) {
    logger.error('Failed to delete tenant', { 
      error: error.message, 
      stack: error.stack,
      tenantId
    });
    
    throw new Error(`Failed to delete tenant ${tenantId}: ${error.message}`);
  }
}

module.exports = {
  provisionTenant,
  getTenantInfo,
  listTenants,
  deleteTenant
};
```

### Updated Data Isolation Middleware
```javascript
// src/middleware/dataIsolationMiddleware.js (after migration)
const logger = require('../utils/logger');

/**
 * Data Isolation Middleware
 * Ensures operations are scoped to tenant through Supabase RLS
 */
function ensureDataIsolation(req, res, next) {
  try {
    // Get tenant ID from request (set by tenant middleware)
    const tenantId = req.tenantId || 'default';
    
    // Set tenant context for Supabase RLS
    // This is handled by tenantMiddleware which calls set_tenant_context RPC
    
    logger.debug('Data isolation configured through RLS', { tenantId });
    next();
  } catch (error) {
    logger.error('Error configuring data isolation', { 
      error: error.message, 
      stack: error.stack,
      operation: 'ensureDataIsolation',
      tenantId: req.tenantId
    });
    res.status(500).json({ error: 'Data isolation configuration failed' });
  }
}

module.exports = { ensureDataIsolation };
```

### Interaction Repository
```javascript
// src/repositories/interactionRepository.js
const supabase = require('../utils/supabaseClient');

async function getInteractions(tenantId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  const { data, error, count } = await supabase
    .from('interactions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .range(offset, offset + limit - 1);
  
  if (error) throw new Error(error.message);
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalCount: count,
      totalPages: Math.ceil(count / limit)
    }
  };
}

async function getInteractionsByEmployeeId(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId);
  
  if (error) throw new Error(error.message);
  return data;
}

async function createInteraction(tenantId, interactionData) {
  const { data, error } = await supabase
    .from('interactions')
    .insert([{ 
      ...interactionData, 
      tenant_id: tenantId
    }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

module.exports = {
  getInteractions,
  getInteractionsByEmployeeId,
  createInteraction
};
```

### Kudos Repository
```javascript
// src/repositories/kudosRepository.js
const supabase = require('../utils/supabaseClient');

async function getKudos(tenantId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  const { data, error, count } = await supabase
    .from('kudos')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .range(offset, offset + limit - 1);
  
  if (error) throw new Error(error.message);
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalCount: count,
      totalPages: Math.ceil(count / limit)
    }
  };
}

async function getKudosByEmployeeId(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('kudos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('to_employee_id', employeeId);
  
  if (error) throw new Error(error.message);
  return data;
}

async function createKudos(tenantId, kudosData) {
  const { data, error } = await supabase
    .from('kudos')
    .insert([{ 
      ...kudosData, 
      tenant_id: tenantId
    }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

module.exports = {
  getKudos,
  getKudosByEmployeeId,
  createKudos
};
```

### Updated Controllers

#### Interaction Controller
```javascript
// src/controllers/interactionController.js (after migration)
const interactionRepository = require('../repositories/interactionRepository');
const employeeRepository = require('../repositories/employeeRepository');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

async function getInteractions(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ 
        error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.' 
      });
    }
    
    const result = await interactionRepository.getInteractions(tenantId, page, limit);
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve interactions', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getInteractions'
    });
    res.status(500).json({ error: 'Failed to retrieve interactions' });
  }
}

async function getInteractionsByEmployeeId(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default';
    
    const interactions = await interactionRepository.getInteractionsByEmployeeId(tenantId, id);
    
    res.json(interactions);
  } catch (error) {
    logger.error('Failed to retrieve interactions for employee', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getInteractionsByEmployeeId'
    });
    res.status(500).json({ error: 'Failed to retrieve interactions' });
  }
}

async function createInteraction(req, res) {
  try {
    const interaction = req.body;
    const tenantId = req.tenantId || 'default';
    
    // Validate interaction data
    const validation = validateInteractionData(interaction);
    if (!validation.isValid) {
      throw new ValidationError('Validation failed', validation.errors);
    }
    
    // Check if employee exists
    try {
      await employeeRepository.getEmployeeById(tenantId, interaction.employee_id);
    } catch (error) {
      throw new NotFoundError('Employee not found', 'employee');
    }
    
    // Add timestamp if not provided
    interaction.timestamp = interaction.timestamp || new Date().toISOString();
    
    const newInteraction = await interactionRepository.createInteraction(tenantId, interaction);
    
    res.status(201).json({ 
      message: 'Interaction created successfully', 
      interaction: newInteraction 
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: error.message,
        field: error.field
      });
    }
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: error.message,
        resource: error.resource
      });
    }
    
    logger.error('Failed to create interaction', { 
      error: error.message, 
      stack: error.stack,
      operation: 'createInteraction'
    });
    res.status(500).json({ error: 'Failed to create interaction' });
  }
}
```

#### Contribution Controller
```javascript
// src/controllers/contributionController.js (after migration)
const contributionRepository = require('../repositories/contributionRepository');
const employeeRepository = require('../repositories/employeeRepository');
const interactionRepository = require('../repositories/interactionRepository');
const kudosRepository = require('../repositories/kudosRepository');
const { 
  calculateProblemSolvingScore, 
  calculateCollaborationScore, 
  calculateInitiativeScore,
  calculateOverallScore
} = require('../services/scoringService');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/customErrors');

async function getContributions(req, res) {
  try {
    const tenantId = req.tenantId || 'default';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ 
        error: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.' 
      });
    }
    
    const result = await contributionRepository.getContributions(tenantId, page, limit);
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to retrieve contributions', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getContributions'
    });
    res.status(500).json({ error: 'Failed to retrieve contributions' });
  }
}

async function getContributionsByEmployeeId(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || 'default';
    
    const contributions = await contributionRepository.getContributionsByEmployeeId(tenantId, id);
    
    res.json(contributions);
  } catch (error) {
    logger.error('Failed to retrieve contributions for employee', { 
      error: error.message, 
      stack: error.stack,
      operation: 'getContributionsByEmployeeId'
    });
    res.status(500).json({ error: 'Failed to retrieve contributions' });
  }
}

async function addContributionScores(req, res) {
  try {
    const contributionData = req.body;
    const tenantId = req.tenantId || 'default';
    
    // Validate contribution data
    const validation = validateContributionData(contributionData);
    if (!validation.isValid) {
      throw new ValidationError('Validation failed', validation.errors);
    }
    
    // Check if employee exists
    try {
      await employeeRepository.getEmployeeById(tenantId, contributionData.employee_id);
    } catch (error) {
      throw new NotFoundError('Employee not found', 'employee');
    }
    
    // Check if scores are provided manually, otherwise calculate automatically
    let { 
      problem_solving_score, 
      collaboration_score, 
      initiative_score, 
      overall_score 
    } = contributionData;
    
    // If scores are not provided manually, calculate them automatically
    if (problem_solving_score === undefined || 
        collaboration_score === undefined || 
        initiative_score === undefined || 
        overall_score === undefined) {
      
      // Get employee data
      const employee = await employeeRepository.getEmployeeById(tenantId, contributionData.employee_id);
      
      // Get employee interactions
      const interactions = await interactionRepository.getInteractionsByEmployeeId(tenantId, contributionData.employee_id);
      
      // Get employee kudos
      const kudos = await kudosRepository.getKudosByEmployeeId(tenantId, contributionData.employee_id);
      
      // Get all employees for collaboration calculation
      const { data: allEmployees } = await employeeRepository.getEmployees(tenantId);
      
      // Calculate scores if not provided
      if (problem_solving_score === undefined) {
        // Calculate average problem-solving score from interactions
        if (interactions.length > 0) {
          const totalScore = interactions.reduce((sum, interaction) => {
            return sum + calculateProblemSolvingScore(interaction.content);
          }, 0);
          problem_solving_score = Math.round(totalScore / interactions.length);
        } else {
          problem_solving_score = 0;
        }
      }
      
      if (collaboration_score === undefined) {
        collaboration_score = calculateCollaborationScore(kudos, allEmployees);
      }
      
      if (initiative_score === undefined) {
        // Calculate average initiative score from interactions
        if (interactions.length > 0) {
          const totalScore = interactions.reduce((sum, interaction) => {
            return sum + calculateInitiativeScore(interaction.content);
          }, 0);
          initiative_score = Math.round(totalScore / interactions.length);
        } else {
          initiative_score = 0;
        }
      }
      
      if (overall_score === undefined) {
        overall_score = calculateOverallScore(
          problem_solving_score,
          collaboration_score,
          initiative_score
        );
      }
    }
    
    // Validate score ranges (double check after calculation)
    if (problem_solving_score < 0 || problem_solving_score > 100 ||
        collaboration_score < 0 || collaboration_score > 100 ||
        initiative_score < 0 || initiative_score > 100 ||
        overall_score < 0 || overall_score > 100) {
      throw new ValidationError('Scores must be between 0 and 100', 'scores');
    }
    
    // Create contribution object
    const newContribution = {
      employee_id: contributionData.employee_id,
      date: contributionData.date || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      problem_solving_score: problem_solving_score,
      collaboration_score: collaboration_score,
      initiative_score: initiative_score,
      overall_score: overall_score
    };
    
    const savedContribution = await contributionRepository.createContribution(tenantId, newContribution);
    
    res.status(201).json({ 
      message: 'Contribution scores added successfully', 
      contribution: savedContribution 
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: error.message,
        field: error.field
      });
    }
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: error.message,
        resource: error.resource
      });
    }
    
    logger.error('Failed to add contribution scores', { 
      error: error.message, 
      stack: error.stack,
      operation: 'addContributionScores'
    });
    res.status(500).json({ error: 'Failed to add contribution scores' });
  }
}
```

## Multi-tenancy Implementation

Multi-tenancy is implemented using Supabase Row Level Security (RLS) policies:

```sql
-- Example policy for interactions table
CREATE POLICY "Interactions are viewable by tenant" 
ON interactions FOR SELECT 
USING (tenant_id = current_setting('app.tenant_id'));

CREATE POLICY "Interactions are insertable by tenant" 
ON interactions FOR INSERT 
WITH CHECK (tenant_id = current_setting('app.tenant_id'));
```

The tenant context is set automatically by the application middleware:
```javascript
// In middleware/tenantMiddleware.js
await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
```

## Testing Strategy

### Unit Tests
1. Repository tests for all CRUD operations
2. Service tests with mocked repositories
3. Controller tests with mocked services

### Integration Tests
1. End-to-end tests for all API endpoints
2. Multi-tenancy isolation tests
3. Data validation tests

### Migration Tests
1. Data consistency tests between CSV and Supabase
2. Performance comparison tests
3. Rollback scenario tests

### Validation Checklist
- [ ] All controllers import repositories instead of CSV utilities
- [ ] All services use repositories for data access
- [ ] No direct calls to CSV reader/writer functions
- [ ] All API endpoints function correctly with Supabase
- [ ] Multi-tenancy isolation is maintained through RLS
- [ ] Backup and restore functionality works with Supabase
- [ ] Tenant provisioning works with Supabase
- [ ] All existing tests pass
- [ ] No CSV files are accessed during normal operation
- [ ] All CSV utility files have been removed
- [ ] Data directory structure is no longer used

## Rollback Plan

If issues are encountered with the Supabase implementation:

1. Revert to the previous codebase version
2. Restore CSV files from backup
3. Remove Supabase configuration and dependencies
4. Reconfigure environment variables for CSV-based storage

## Performance Considerations

1. **Query Optimization**: Use proper indexing on frequently queried columns
2. **Connection Pooling**: Utilize Supabase's built-in connection pooling
3. **Caching**: Implement caching for frequently accessed data
4. **Pagination**: Ensure all list endpoints use proper pagination

## Security Considerations

1. **Row Level Security**: All tables have RLS policies to ensure tenant isolation
2. **Authentication**: Supabase Auth replaces custom JWT implementation
3. **Data Validation**: Input validation at both controller and database levels
4. **Error Handling**: Proper error messages without exposing sensitive information

## Monitoring and Logging

1. **Operation Logging**: All database operations are logged with tenant context
2. **Performance Metrics**: Query execution times are logged for performance monitoring
3. **Error Tracking**: All database errors are properly logged with context

## Deployment Steps

1. Update environment variables with Supabase credentials
2. Run database schema initialization script
3. Deploy updated application code
4. Run data migration script (if applicable)
5. Execute test suite to verify functionality
6. Monitor application performance and errors