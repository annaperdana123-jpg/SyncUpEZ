const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const lockfile = require('proper-lockfile');
const logger = require('./logger');

/**
 * Write data to a CSV file with file locking
 * @param {string} filePath - Path to the CSV file
 * @param {Array} headers - Array of header objects {id, title}
 * @param {Array} records - Array of record objects to write
 * @param {boolean} append - Whether to append to existing file
 */
async function writeCSV(filePath, headers, records, append = false) {
  const startTime = Date.now();
  let release;
  
  try {
    logger.debug('Attempting to acquire write lock', { filePath });
    
    // Acquire an exclusive lock with a timeout
    release = await lockfile.lock(filePath, {
      retries: {
        retries: 3,
        factor: 2,
        minTimeout: 50,
        maxTimeout: 200
      },
      stale: 5000, // 5 seconds
      realpath: false
    });
    
    logger.debug('Write lock acquired', { filePath, lockTime: Date.now() - startTime });
    
    // If not appending and file exists, remove it first
    if (!append && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug('Existing file removed', { filePath });
    }
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: headers,
      append: append
    });
    
    await csvWriter.writeRecords(records);
    logger.debug('Records written to CSV', { filePath, recordCount: records.length });
    
    // Ensure there's a newline at the end of the file
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.endsWith('\n')) {
        fs.appendFileSync(filePath, '\n');
        logger.debug('Newline appended to file', { filePath });
      }
    }
    
    const totalTime = Date.now() - startTime;
    logger.info('CSV write operation completed', { 
      filePath, 
      recordCount: records.length, 
      totalTimeMs: totalTime,
      operation: 'writeCSV'
    });
  } catch (error) {
    logger.error('Failed to write CSV file', { 
      filePath, 
      error: error.message, 
      stack: error.stack,
      operation: 'writeCSV'
    });
    throw new Error(`Failed to write CSV file ${filePath}: ${error.message}`);
  } finally {
    // Release the lock
    if (release) {
      try {
        await release();
        logger.debug('Write lock released', { filePath });
      } catch (error) {
        // Log the error but don't throw as the main operation was successful
        logger.warn(`Failed to release lock on ${filePath}`, { 
          error: error.message,
          operation: 'writeCSV'
        });
      }
    }
  }
}

/**
 * Append a single record to a CSV file with file locking
 * @param {string} filePath - Path to the CSV file
 * @param {Array} headers - Array of header objects {id, title}
 * @param {Object} record - Record object to append
 */
async function appendCSV(filePath, headers, record) {
  const startTime = Date.now();
  let release;
  
  try {
    logger.debug('Attempting to acquire append lock', { filePath });
    
    // Acquire an exclusive lock with a timeout
    release = await lockfile.lock(filePath, {
      retries: {
        retries: 3,
        factor: 2,
        minTimeout: 50,
        maxTimeout: 200
      },
      stale: 5000, // 5 seconds
      realpath: false
    });
    
    logger.debug('Append lock acquired', { filePath, lockTime: Date.now() - startTime });
    
    // Check if file exists and has content (more than just headers)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      // Split by newlines and filter out empty lines
      const lines = content.split('\n').filter(line => line.trim() !== '');
      // Check if there are more lines than just the header
      if (lines.length > 1) {
        // Manually append the record
        const values = headers.map(header => {
          const value = record[header.id] || '';
          // Escape commas and quotes in the value
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
        
        fs.appendFileSync(filePath, `\n${values}\n`);
        logger.debug('Record appended to existing file', { filePath });
        const totalTime = Date.now() - startTime;
        logger.info('CSV append operation completed', { 
          filePath, 
          totalTimeMs: totalTime,
          operation: 'appendCSV'
        });
        return;
      }
    }
    
    // If file doesn't exist or is empty, create it with headers
    const csvWriter = createCsvWriter({
      path: filePath,
      header: headers,
      append: false
    });
    
    await csvWriter.writeRecords([record]);
    logger.debug('New file created with record', { filePath });
    
    // Ensure there's a newline at the end of the file
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.endsWith('\n')) {
        fs.appendFileSync(filePath, '\n');
        logger.debug('Newline appended to file', { filePath });
      }
    }
    
    const totalTime = Date.now() - startTime;
    logger.info('CSV append operation completed', { 
      filePath, 
      totalTimeMs: totalTime,
      operation: 'appendCSV'
    });
  } catch (error) {
    logger.error('Failed to append to CSV file', { 
      filePath, 
      error: error.message, 
      stack: error.stack,
      operation: 'appendCSV'
    });
    throw new Error(`Failed to append to CSV file ${filePath}: ${error.message}`);
  } finally {
    // Release the lock
    if (release) {
      try {
        await release();
        logger.debug('Append lock released', { filePath });
      } catch (error) {
        // Log the error but don't throw as the main operation was successful
        logger.warn(`Failed to release lock on ${filePath}`, { 
          error: error.message,
          operation: 'appendCSV'
        });
      }
    }
  }
}

module.exports = { writeCSV, appendCSV };