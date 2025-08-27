#!/usr/bin/env node

/**
 * Script to initialize Supabase database schema
 * This script creates the required tables and RLS policies
 */

const supabase = require('../src/utils/supabaseClient');

async function initSchema() {
  console.log('Initializing Supabase database schema...');
  
  try {
    // Create employees table
    const { error: employeesError } = await supabase.rpc('create_employees_table');
    if (employeesError) {
      console.error('Error creating employees table:', employeesError.message);
    } else {
      console.log('Employees table created successfully');
    }
    
    // Create interactions table
    const { error: interactionsError } = await supabase.rpc('create_interactions_table');
    if (interactionsError) {
      console.error('Error creating interactions table:', interactionsError.message);
    } else {
      console.log('Interactions table created successfully');
    }
    
    // Create kudos table
    const { error: kudosError } = await supabase.rpc('create_kudos_table');
    if (kudosError) {
      console.error('Error creating kudos table:', kudosError.message);
    } else {
      console.log('Kudos table created successfully');
    }
    
    // Create contributions table
    const { error: contributionsError } = await supabase.rpc('create_contributions_table');
    if (contributionsError) {
      console.error('Error creating contributions table:', contributionsError.message);
    } else {
      console.log('Contributions table created successfully');
    }
    
    // Create tenants table
    const { error: tenantsError } = await supabase.rpc('create_tenants_table');
    if (tenantsError) {
      console.error('Error creating tenants table:', tenantsError.message);
    } else {
      console.log('Tenants table created successfully');
    }
    
    // Create RLS policies
    const { error: rlsError } = await supabase.rpc('create_rls_policies');
    if (rlsError) {
      console.error('Error creating RLS policies:', rlsError.message);
    } else {
      console.log('RLS policies created successfully');
    }
    
    // Create tenant context function
    const { error: contextError } = await supabase.rpc('create_tenant_context_function');
    if (contextError) {
      console.error('Error creating tenant context function:', contextError.message);
    } else {
      console.log('Tenant context function created successfully');
    }
    
    console.log('Schema initialization completed');
  } catch (error) {
    console.error('Error initializing schema:', error.message);
    process.exit(1);
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initSchema();
}

module.exports = { initSchema };