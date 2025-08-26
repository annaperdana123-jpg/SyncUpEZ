const fs = require('fs');
const path = require('path');
const { readCSV } = require('./csvReader');
const { writeCSV, appendCSV } = require('./csvWriter');
const logger = require('./logger');

/**
 * Get tenant-specific file path
 * @param {string} tenantId - The tenant ID
 * @param {string} fileName - The name of the CSV file
 * @returns {string} - Full path to the tenant-specific file
 */
function getTenantFilePath(tenantId, fileName) {
  const tenantDataPath = path.join(__dirname, `../../data/${tenantId}`);
  return path.join(tenantDataPath, fileName);
}

/**
 * Read data from a tenant-specific CSV file
 * @param {string} tenantId - The tenant ID
 * @param {string} fileName - The name of the CSV file
 * @returns {Promise<Array>} - Promise that resolves to an array of objects
 */
async function readTenantCSV(tenantId, fileName) {
  const filePath = getTenantFilePath(tenantId, fileName);
  return await readCSV(filePath);
}

/**
 * Write data to a tenant-specific CSV file
 * @param {string} tenantId - The tenant ID
 * @param {string} fileName - The name of the CSV file
 * @param {Array} headers - Array of header objects {id, title}
 * @param {Array} data - The data to write
 * @param {boolean} append - Whether to append to existing file
 * @returns {Promise<void>}
 */
async function writeTenantCSV(tenantId, fileName, headers, data, append = false) {
  const filePath = getTenantFilePath(tenantId, fileName);
  
  // Ensure tenant directory exists
  const tenantDataPath = path.join(__dirname, `../../data/${tenantId}`);
  if (!fs.existsSync(tenantDataPath)) {
    fs.mkdirSync(tenantDataPath, { recursive: true });
  }
  
  return await writeCSV(filePath, headers, data, append);
}

/**
 * Append a single record to a tenant-specific CSV file
 * @param {string} tenantId - The tenant ID
 * @param {string} fileName - The name of the CSV file
 * @param {Array} headers - Array of header objects {id, title}
 * @param {Object} record - The record to append
 * @returns {Promise<void>}
 */
async function appendToTenantCSV(tenantId, fileName, headers, record) {
  const filePath = getTenantFilePath(tenantId, fileName);
  
  // Ensure tenant directory exists
  const tenantDataPath = path.join(__dirname, `../../data/${tenantId}`);
  if (!fs.existsSync(tenantDataPath)) {
    fs.mkdirSync(tenantDataPath, { recursive: true });
  }
  
  return await appendCSV(filePath, headers, record);
}

module.exports = { 
  getTenantFilePath, 
  readTenantCSV, 
  writeTenantCSV, 
  appendToTenantCSV 
};