# Supabase Migration: Complete Replacement of CSV Files

## Overview

This document outlines the plan to completely replace all CSV-based file storage with Supabase database implementation in the SyncUp application. Currently, the application has a hybrid approach where some components use Supabase while others still rely on CSV files. This migration will ensure a consistent, scalable, and maintainable data storage solution.

## Architecture

### Current State
The application currently uses a hybrid approach:
- **Supabase**: Used for employee, interaction, kudos, contributions, and tenant data storage
- **CSV Files**: Still used in backup service, data isolation middleware, and migration scripts
- **Authentication**: Using Supabase Auth instead of custom JWT implementation

### Target State
All data storage will be handled by Supabase:
- All repositories will use Supabase client for data operations
- Backup functionality will be reimplemented using Supabase backup features
- Data isolation will be handled entirely by Supabase RLS (Row Level Security)
- Migration scripts will be updated to work with Supabase directly

## Components Requiring Updates

### 1. Data Isolation Middleware (`src/middleware/dataIsolationMiddleware.js`)
**Current Issue**: Still references CSV files for tenant data initialization
**Required Changes**:
- Remove CSV file initialization logic
- Update tenant initialization to use Supabase tenant table
- Remove file system operations
- Replace `ensureDataIsolation` function with Supabase tenant validation

### 2. Backup Service (`src/services/backupService.js`)
**Current Issue**: Still uses CSV file paths for backup operations
**Required Changes**:
- Replace file-based backup with Supabase backup functionality
- Update backup scheduling to work with database backups
- Remove all file system operations
- Implement database export/import for backup functionality

### 3. Migration Scripts (`scripts/migrateDataToSupabase.js`)
**Current Issue**: Uses CSV files as source for data migration
**Required Changes**:
- Update migration script to be a one-time operation
- Remove dependency on CSV files after initial migration
- Add validation to prevent re-migration of data
- Add migration status tracking in Supabase

### 4. Package Dependencies (`package.json`)
**Current Issue**: Still includes CSV-related dependencies
**Required Changes**:
- Remove `csv-parser` and `csv-writer` from dependencies
- Remove `proper-lockfile` as file locking is no longer needed
- Update package description to reflect database-based implementation

### 5. Utility Files
**Current Issue**: CSV utility files still exist in the codebase
**Required Files to Remove**:
- `src/utils/csvReader.js`
- `src/utils/csvWriter.js`
- `src/utils/tenantCsvUtils.js`

## Implementation Plan

### Phase 1: Update Middleware Components
1. Modify `dataIsolationMiddleware.js` to remove CSV file initialization
   - Remove `initializeTenantDataFiles` function
   - Remove file system operations for creating tenant directories
   - Replace with Supabase tenant validation
   - Update `ensureDataIsolation` function to validate tenant exists in Supabase
2. Update tenant initialization to work with Supabase tenant table
   - Create new tenants in `tenants` table when first accessed
   - Remove file system directory creation
3. Test tenant isolation with new implementation
   - Verify tenant context is properly set for Supabase RLS
   - Ensure new tenants are properly initialized in database

### Phase 2: Replace Backup Service
1. Rewrite `backupService.js` to use Supabase backup features
   - Replace file-based backup with database export functionality
   - Implement backup scheduling using Supabase backup APIs or custom export
   - Remove all CSV file operations
   - Use Supabase export functionality or implement custom JSON export
2. Update backup scheduling to work with database backups
   - Schedule regular database exports instead of file backups
   - Implement retention policies for database backups
3. Remove all file-based backup code
   - Remove references to CSV files
   - Remove file system operations
   - Update backup status tracking to use database

### Phase 3: Clean Up Dependencies
1. Remove unused CSV dependencies from `package.json`
   - Remove `csv-parser`
   - Remove `csv-writer`
   - Remove `proper-lockfile`
2. Update package description and keywords
3. Remove unused CSV utility files
   - `src/utils/csvReader.js`
   - `src/utils/csvWriter.js`
   - `src/utils/tenantCsvUtils.js`

### Phase 4: Update Migration Scripts
1. Update `migrateDataToSupabase.js` to prevent re-migration
   - Add migration status tracking
   - Implement idempotent migration operations
2. Remove dependency on CSV files after initial migration

### Phase 5: Update Documentation
1. Update implementation summaries to reflect full Supabase implementation
2. Remove references to CSV-based approach
3. Update README and other documentation files

## Data Models & Database Schema

The application uses the following Supabase tables that have already been defined in `supabase-schema.sql`:

1. **employees** - Stores employee information
2. **interactions** - Tracks employee interactions
3. **kudos** - Manages peer recognition system
4. **contributions** - Contains contribution scoring data
5. **tenants** - Manages multi-tenancy

All tables have Row Level Security (RLS) policies to ensure tenant data isolation.

## Business Logic Layer

### Repository Layer
All repositories have been updated to use Supabase:
- `employeeRepository.js` - Employee data operations
- `interactionRepository.js` - Interaction data operations
- `kudosRepository.js` - Kudos data operations
- `contributionRepository.js` - Contribution data operations
- `tenantRepository.js` - Tenant data operations

### Service Layer
Services use repositories for data operations:
- `employeeService.js` - Employee business logic
- `analyticsService.js` - Analytics calculations
- `scoringService.js` - Contribution scoring algorithms
- `backupService.js` - Needs update to remove CSV dependencies
- `tenantService.js` - Tenant management

## Middleware & Interceptors

### Authentication
Using Supabase Auth instead of custom JWT implementation:
- `authMiddleware.js` - Validates Supabase session tokens
- `tenantMiddleware.js` - Resolves tenant context and sets Supabase RLS

### Data Isolation
Handled by Supabase RLS policies:
- `dataIsolationMiddleware.js` - Needs update to remove CSV file initialization

## Testing Strategy

### Unit Tests
- Update tests to remove CSV file mocking
- Ensure all tests work with Supabase implementation
- Update test data factories to work with database
- Test tenant initialization with Supabase

### Integration Tests
- Update integration tests to work with Supabase
- Remove file system dependency in tests
- Validate tenant isolation with Supabase RLS
- Test backup and restore functionality
- Validate data consistency across operations

### Migration Tests
- Test data migration from CSV to Supabase
- Validate data integrity after migration
- Test rollback procedures
- Verify no data loss during migration
- Test migration with large datasets

### Performance Tests
- Compare performance between CSV and Supabase implementations
- Test concurrent access scenarios
- Validate RLS performance with multiple tenants
- Test backup and restore performance

## Rollout Plan

### 1. Development Environment
- Implement all changes in development branch
- Run comprehensive test suite
- Validate data migration process

### 2. Staging Environment
- Deploy to staging environment
- Test with production-like data
- Validate backup and restore procedures

### 3. Production Environment
- Schedule deployment during maintenance window
- Execute data migration
- Monitor application performance
- Validate all functionality

## Timeline

### Phase 1: Development (2 weeks)
- Update middleware components
- Implement new backup service
- Update migration scripts

### Phase 2: Testing (1 week)
- Run comprehensive test suite
- Performance testing
- Validate rollback procedures

### Phase 3: Staging (3 days)
- Deploy to staging
- Test with production-like data
- Final validation

### Phase 4: Production (2 days)
- Deploy to production
- Execute migration
- Monitor and validate

## Success Criteria

### Technical Criteria
- All data successfully migrated from CSV to Supabase
- No data loss during migration
- All functionality working as expected
- Performance meets or exceeds CSV implementation
- Backup and restore functionality working

### Operational Criteria
- No downtime during migration
- Successful rollback procedures tested
- All tests passing
- Documentation updated

### Business Criteria
- Improved scalability and performance
- Better data integrity
- Simplified maintenance
- Enhanced security through Supabase

## Risk Mitigation

### Data Loss Prevention
- Create full database backups before migration
- Implement rollback procedures
- Test restore procedures thoroughly

### Performance Impact
- Monitor database performance during migration
- Optimize queries for Supabase
- Implement connection pooling if needed

### Downtime Minimization
- Perform migration with minimal downtime
- Use blue-green deployment if possible
- Have rollback plan ready

## Rollback Plan

### If Issues Occur During Migration
1. Halt migration process immediately
2. Restore database from pre-migration backup
3. Revert code changes to previous version
4. Investigate and fix issues
5. Reschedule migration

### If Issues Occur After Migration
1. Assess impact and severity
2. If critical, rollback to previous version
3. If non-critical, implement hotfixes
4. Monitor system performance closely

### Rollback Prerequisites
- Full database backup before migration
- Version-controlled codebase
- Comprehensive test suite to validate rollback

## Cleanup Tasks

After successful migration:
1. Remove all CSV utility files
2. Remove CSV dependencies from package.json
3. Update all documentation
4. Remove data directory and contents
5. Update environment variables documentation