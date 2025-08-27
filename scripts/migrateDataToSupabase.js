#!/usr/bin/env node

/**
 * Script to migrate data from CSV files to Supabase
 * This script reads existing CSV data and inserts it into Supabase tables
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const supabase = require('../src/utils/supabaseClient');
const { readTenantCSV } = require('../src/utils/tenantCsvUtils');

// Function to read CSV file
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`CSV file does not exist: ${filePath}`);
      resolve(results);
      return;
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`CSV file read successfully: ${filePath}, record count: ${results.length}`);
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Function to get all tenant directories
function getTenantDirectories(dataPath) {
  try {
    const items = fs.readdirSync(dataPath);
    return items.filter(item => {
      const itemPath = path.join(dataPath, item);
      return fs.statSync(itemPath).isDirectory();
    });
  } catch (error) {
    console.error('Error reading data directory:', error.message);
    return [];
  }
}

// Function to migrate employees data
async function migrateEmployees(tenantId) {
  try {
    console.log(`Migrating employees for tenant: ${tenantId}`);
    
    const employees = await readTenantCSV(tenantId, 'employees.csv');
    
    if (employees.length === 0) {
      console.log(`No employees found for tenant: ${tenantId}`);
      return;
    }
    
    // Insert employees into Supabase
    const { data, error } = await supabase
      .from('employees')
      .insert(employees.map(emp => ({
        ...emp,
        tenant_id: tenantId
      })));
    
    if (error) {
      console.error(`Error migrating employees for tenant ${tenantId}:`, error.message);
      return;
    }
    
    console.log(`Successfully migrated ${employees.length} employees for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`Error migrating employees for tenant ${tenantId}:`, error.message);
  }
}

// Function to migrate interactions data
async function migrateInteractions(tenantId) {
  try {
    console.log(`Migrating interactions for tenant: ${tenantId}`);
    
    const interactions = await readTenantCSV(tenantId, 'interactions.csv');
    
    if (interactions.length === 0) {
      console.log(`No interactions found for tenant: ${tenantId}`);
      return;
    }
    
    // Insert interactions into Supabase
    const { data, error } = await supabase
      .from('interactions')
      .insert(interactions.map(interaction => ({
        ...interaction,
        tenant_id: tenantId
      })));
    
    if (error) {
      console.error(`Error migrating interactions for tenant ${tenantId}:`, error.message);
      return;
    }
    
    console.log(`Successfully migrated ${interactions.length} interactions for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`Error migrating interactions for tenant ${tenantId}:`, error.message);
  }
}

// Function to migrate kudos data
async function migrateKudos(tenantId) {
  try {
    console.log(`Migrating kudos for tenant: ${tenantId}`);
    
    const kudos = await readTenantCSV(tenantId, 'kudos.csv');
    
    if (kudos.length === 0) {
      console.log(`No kudos found for tenant: ${tenantId}`);
      return;
    }
    
    // Insert kudos into Supabase
    const { data, error } = await supabase
      .from('kudos')
      .insert(kudos.map(kudo => ({
        ...kudo,
        tenant_id: tenantId
      })));
    
    if (error) {
      console.error(`Error migrating kudos for tenant ${tenantId}:`, error.message);
      return;
    }
    
    console.log(`Successfully migrated ${kudos.length} kudos for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`Error migrating kudos for tenant ${tenantId}:`, error.message);
  }
}

// Function to migrate contributions data
async function migrateContributions(tenantId) {
  try {
    console.log(`Migrating contributions for tenant: ${tenantId}`);
    
    const contributions = await readTenantCSV(tenantId, 'contributions.csv');
    
    if (contributions.length === 0) {
      console.log(`No contributions found for tenant: ${tenantId}`);
      return;
    }
    
    // Insert contributions into Supabase
    const { data, error } = await supabase
      .from('contributions')
      .insert(contributions.map(contribution => ({
        ...contribution,
        tenant_id: tenantId
      })));
    
    if (error) {
      console.error(`Error migrating contributions for tenant ${tenantId}:`, error.message);
      return;
    }
    
    console.log(`Successfully migrated ${contributions.length} contributions for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`Error migrating contributions for tenant ${tenantId}:`, error.message);
  }
}

// Main migration function
async function migrateAllData() {
  console.log('Starting data migration from CSV to Supabase...');
  
  try {
    // Get data path from environment or use default
    const dataPath = process.env.DATA_PATH || './data';
    console.log(`Data path: ${dataPath}`);
    
    // Get all tenant directories
    const tenantDirectories = getTenantDirectories(dataPath);
    console.log(`Found ${tenantDirectories.length} tenant directories`);
    
    // Add default tenant if it doesn't exist in directories
    if (!tenantDirectories.includes('default')) {
      tenantDirectories.push('default');
    }
    
    // Migrate data for each tenant
    for (const tenantId of tenantDirectories) {
      console.log(`\n--- Migrating data for tenant: ${tenantId} ---`);
      
      // Migrate each data type
      await migrateEmployees(tenantId);
      await migrateInteractions(tenantId);
      await migrateKudos(tenantId);
      await migrateContributions(tenantId);
    }
    
    console.log('\nData migration completed successfully!');
  } catch (error) {
    console.error('Error during data migration:', error.message);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateAllData();
}

module.exports = { migrateAllData };