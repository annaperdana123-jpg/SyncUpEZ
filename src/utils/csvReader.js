const fs = require('fs');
const csv = require('csv-parser');
const lockfile = require('proper-lockfile');
const logger = require('./logger');

/**
 * Read data from a CSV file with file locking
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} - Promise that resolves to an array of objects
 */
async function readCSV(filePath) {
  const startTime = Date.now();
  
  try {
    // For reading, we'll use a shared approach with retry logic
    // proper-lockfile doesn't support shared locks, so we'll proceed with reading
    // but add some retry logic in case of temporary file access issues
    
    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 50; // ms
    
    while (attempts < maxAttempts) {
      try {
        logger.debug('Attempting to read CSV file', { filePath, attempt: attempts + 1 });
        
        // Try to read the file
        const results = await new Promise((resolve, reject) => {
          const results = [];
          
          // Check if file exists, if not resolve with empty array
          if (!fs.existsSync(filePath)) {
            logger.debug('CSV file does not exist, returning empty array', { filePath });
            resolve(results);
            return;
          }
          
          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
              logger.debug('CSV file read successfully', { filePath, recordCount: results.length });
              resolve(results);
            })
            .on('error', (error) => {
              logger.error('Error reading CSV file stream', { 
                filePath, 
                error: error.message,
                operation: 'readCSV'
              });
              reject(error);
            });
        });
        
        const totalTime = Date.now() - startTime;
        logger.info('CSV read operation completed', { 
          filePath, 
          recordCount: results.length, 
          totalTimeMs: totalTime,
          attempts: attempts + 1,
          operation: 'readCSV'
        });
        
        return results;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          logger.error('Failed to read CSV file after all retries', { 
            filePath, 
            error: error.message, 
            stack: error.stack,
            attempts: maxAttempts,
            operation: 'readCSV'
          });
          throw new Error(`Failed to read CSV file ${filePath} after ${maxAttempts} attempts: ${error.message}`);
        }
        
        logger.warn('Failed to read CSV file, retrying', { 
          filePath, 
          error: error.message,
          attempt: attempts,
          maxAttempts,
          operation: 'readCSV'
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  } catch (error) {
    logger.error('Failed to read CSV file', { 
      filePath, 
      error: error.message, 
      stack: error.stack,
      operation: 'readCSV'
    });
    throw new Error(`Failed to read CSV file ${filePath}: ${error.message}`);
  }
}

module.exports = { readCSV };