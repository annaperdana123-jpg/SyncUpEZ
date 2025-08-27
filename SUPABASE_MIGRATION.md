# Supabase Migration Guide

This document provides instructions for migrating SyncUpEZ from CSV-based storage to Supabase PostgreSQL database.

## Overview

SyncUpEZ is being redesigned to use Supabase's free tier instead of CSV files for data storage. This migration involves:

1. Setting up a Supabase project
2. Initializing the database schema
3. Updating the application code to use Supabase client
4. Migrating existing CSV data to Supabase
5. Testing the new implementation

## Prerequisites

- Node.js 14+
- A Supabase account (free tier is sufficient)
- Existing SyncUpEZ installation with data (if migrating)

## Step-by-Step Migration

### 1. Create Supabase Project

1. Go to https://supabase.com/ and create an account
2. Create a new project
3. Note down your project URL and API keys (anon and service role)

### 2. Configure Environment Variables

Update your `.env` and `.env.local` files with your Supabase credentials:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-or-service-key"
```

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 4. Initialize Database Schema

Run the schema initialization script:

```bash
npm run supabase:init
```

This will create the required tables and set up Row Level Security (RLS) policies.

### 5. Update Application Code

The application code has been updated to use Supabase instead of CSV files:

- Data access layer: New repository pattern with Supabase client
- Business logic layer: Updated services using new repositories
- Authentication: Supabase Auth instead of JWT/bcrypt
- Multi-tenancy: RLS policies instead of directory-based isolation

### 6. Migrate Existing Data (Optional)

If you have existing data in CSV files, you can migrate it to Supabase:

```bash
npm run supabase:migrate
```

This script will:
- Read data from existing CSV files
- Insert the data into Supabase tables
- Maintain tenant isolation

### 7. Test the Implementation

Run the test suite to verify the new implementation:

```bash
npm test
```

## Database Schema

The Supabase database uses the following tables:

### employees
- id (UUID, primary key)
- tenant_id (TEXT, for multi-tenancy)
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
- tenant_id (TEXT, for multi-tenancy)
- from_employee_id (TEXT)
- to_employee_id (TEXT)
- interaction_type (TEXT)
- content (TEXT, optional)
- timestamp (TIMESTAMP)
- created_at (TIMESTAMP)

### kudos
- id (UUID, primary key)
- tenant_id (TEXT, for multi-tenancy)
- from_employee_id (TEXT)
- to_employee_id (TEXT)
- message (TEXT)
- timestamp (TIMESTAMP)
- created_at (TIMESTAMP)

### contributions
- id (UUID, primary key)
- tenant_id (TEXT, for multi-tenancy)
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

## Row Level Security (RLS)

RLS policies ensure that tenants can only access their own data:

```sql
-- Example policy for employees table
CREATE POLICY "Employees are viewable by tenant" 
ON employees FOR SELECT 
USING (tenant_id = current_setting('app.tenant_id'));
```

The tenant context is set automatically by the application middleware.

## Authentication

Supabase Auth replaces the custom JWT/bcrypt implementation:

- User registration with `supabase.auth.signUp()`
- User login with `supabase.auth.signInWithPassword()`
- Session management handled by Supabase

## Testing

New tests have been added to verify the Supabase integration:

- Unit tests for repositories
- Integration tests for services
- Multi-tenancy isolation tests
- Authentication flow tests

## Rollback Plan

If you need to rollback to the CSV-based version:

1. Revert to the previous codebase
2. Restore CSV files from backup
3. Remove Supabase configuration

## Troubleshooting

### Common Issues

1. **Supabase connection errors**
   - Verify SUPABASE_URL and SUPABASE_KEY in environment files
   - Check network connectivity to Supabase

2. **RLS policy violations**
   - Ensure tenant context is set correctly
   - Check that user has appropriate permissions

3. **Migration failures**
   - Verify CSV file format matches expected schema
   - Check for data validation errors

### Getting Help

- Check Supabase documentation: https://supabase.com/docs
- Review SyncUpEZ documentation
- Contact support if needed