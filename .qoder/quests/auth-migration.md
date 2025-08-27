# Auth Migration: Replacing bcrypt with Supabase Auth

## Overview

This document outlines the necessary changes to fully migrate from bcrypt password hashing to Supabase Auth in the SyncUp application. Currently, while the authentication controller and middleware have been updated to use Supabase Auth, the employee repository still uses bcrypt for password hashing in the database. This creates inconsistency and potential security issues.

The goal is to completely remove bcrypt usage and rely entirely on Supabase Auth for user authentication and password management.

## Architecture

### Current State
1. **Authentication Flow**
   - Login: Uses Supabase Auth correctly (`supabase.auth.signInWithPassword`)
   - Registration: Uses Supabase Auth correctly (`supabase.auth.signUp`)
   - Token Verification: Uses Supabase Auth correctly (`supabase.auth.getUser`)

2. **Password Handling**
   - Employee Repository: Still uses bcrypt to hash passwords before storing in the database
     - `createEmployee` function hashes password with bcrypt before storing
     - `updateEmployee` function hashes password with bcrypt when updating
   - Dependencies: bcrypt is still listed in package.json dependencies

### Issues with Current Implementation
1. **Dual Password Management**: Passwords are managed both by Supabase Auth and stored in the database
2. **Redundancy**: bcrypt hashing is unnecessary when using Supabase Auth
3. **Security Risk**: Storing hashed passwords in the database when Supabase Auth already handles this
4. **Inconsistency**: Partial migration creates confusion about the authentication mechanism

### Proposed Architecture
1. **Single Source of Truth**: Supabase Auth will be the only system responsible for password management
2. **No Password Storage**: Employee records in the database will not contain password fields
3. **User Identity**: User identity will be verified entirely through Supabase Auth tokens
4. **Clean Separation**: Database will store user profile information, Supabase Auth will handle authentication

## Data Models & Database Schema

### Schema Changes
1. **Remove Password Field**: The `password` column should be removed from the employees table
2. **User Metadata**: User metadata (name, employee_id) will be stored in Supabase Auth user metadata
3. **Profile Data**: Only profile information (department, team, role, etc.) will be stored in the employees table

## Business Logic Layer

### Employee Repository Changes
```javascript
// Before (using bcrypt)
const bcrypt = require('bcrypt');

async function createEmployee(tenantId, employeeData) {
  // Hash password before storing
  const hashedPassword = await bcrypt.hash(employeeData.password, 10);
  
  const { data, error } = await supabase
    .from('employees')
    .insert([{ 
      ...employeeData, 
      tenant_id: tenantId,
      password: hashedPassword  // <-- Remove this
    }])
    .select();
  // ...
}

// After (no bcrypt)
async function createEmployee(tenantId, employeeData) {
  // Remove password from employee data
  const { password, ...employeeWithoutPassword } = employeeData;
  
  const { data, error } = await supabase
    .from('employees')
    .insert([{ 
      ...employeeWithoutPassword, 
      tenant_id: tenantId
    }])
    .select();
  // ...
}
```

### Employee Service Changes
```javascript
// Before
function validateEmployeeData(employee) {
  const errors = [];
  
  // ...
  
  if (!employee.password) {
    errors.push('Password is required');
  } else if (employee.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  // ...
}

// After
function validateEmployeeData(employee) {
  const errors = [];
  
  // ...
  
  // Remove password validation as it's handled by Supabase Auth
  // Password is no longer required for employee records
  
  // ...
}
```

## API Endpoints Reference

The API endpoints will remain the same, but the underlying implementation will change:

1. **Registration Endpoint** (`POST /auth/register`)
   - Will still accept password in request body
   - Password will be handled entirely by Supabase Auth
   - Employee record will be created without password field

2. **Login Endpoint** (`POST /auth/login`)
   - Will still accept email and password
   - Authentication will be handled by Supabase Auth
   - No changes to response format

3. **Employee Management Endpoints**
   - Will no longer accept or return password fields
   - All password management will be handled by Supabase Auth

## Middleware & Interceptors

No changes needed to middleware as they already use Supabase Auth:
1. **Authentication Middleware**: Uses `supabase.auth.getUser` for token verification
2. **Tenant Middleware**: Sets tenant context based on request
3. **Data Isolation Middleware**: Ensures tenant data isolation

## Testing

### Unit Tests
1. **Employee Repository Tests**
   - Remove bcrypt mocking
   - Verify that password is not stored in database operations
   - Ensure employee creation works without password hashing

2. **Employee Service Tests**
   - Update validation tests to not require passwords
   - Verify employee creation works without password requirements

### Integration Tests
1. **Auth Flow Tests**
   - Verify registration creates both Supabase Auth user and employee record
   - Verify login works with Supabase Auth
   - Verify that user profile data is correctly associated with Auth user

### Migration Tests
1. **Data Consistency**
   - Verify that existing employee data is preserved
   - Ensure that new authentication flow works with existing data

## Implementation Plan

### Phase 1: Repository Layer Changes
1. **Modify Employee Repository**
   - Remove bcrypt imports
   - Remove password hashing logic from `createEmployee` function
   - Remove password hashing logic from `updateEmployee` function
   - Remove password field from database operations

2. **Update Employee Service**
   - Remove password validation requirements for employee creation
   - Modify validation logic to not require passwords for employee records

### Phase 2: Database Schema Changes
1. **Update Database Schema**
   - Remove password column from employees table
   - Update any related constraints or indexes

### Phase 3: Dependency Cleanup
1. **Update package.json**
   - Remove bcrypt from dependencies
   - Clean up any related build configurations

### Phase 4: Testing
1. **Update Unit Tests**
   - Remove bcrypt mocking
   - Update test cases to reflect new authentication flow
2. **Integration Testing**
   - Verify registration flow works correctly
   - Verify login flow works correctly
   - Verify that user profile data is properly stored and retrieved

## Security Considerations

1. **Data Migration**: Existing password hashes in the database should be removed
2. **User Migration**: All users will need to re-register as Supabase Auth will handle password storage
3. **Session Management**: Ensure proper session handling through Supabase Auth tokens
4. **Access Control**: Verify that tenant isolation still works correctly with the new auth system

## Rollback Plan

If issues are discovered after deployment:

1. **Revert Code Changes**
   - Restore employee repository with bcrypt functionality
   - Re-add bcrypt dependency to package.json

2. **Database Rollback**
   - Restore password column in employees table
   - Re-implement any removed database constraints

3. **User Communication**
   - Notify users of temporary service disruption
   - Provide guidance on any required actions

## Timeline

1. **Phase 1**: Repository Layer Changes (2 days)
2. **Phase 2**: Database Schema Changes (1 day)
3. **Phase 3**: Dependency Cleanup (0.5 days)
4. **Phase 4**: Testing (2 days)
5. **Total Estimated Time**: 5.5 days

## Success Criteria

1. **Code Changes**
   - All bcrypt references removed from codebase
   - Employee records no longer contain password fields
   - Authentication flows work correctly with Supabase Auth

2. **Testing**
   - All unit tests pass
   - Integration tests validate complete auth flow
   - No security vulnerabilities introduced

3. **Deployment**
   - Successful deployment to staging environment
   - Performance testing shows no degradation
   - User acceptance testing passes