const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'syncup-ez' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write to console in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Function to create tenant-specific logger
function createTenantLogger(tenantId) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'syncup-ez', tenantId },
    transports: [
      // Write all logs with level `error` and below to tenant error log
      new winston.transports.File({ 
        filename: path.join(logsDir, `error-${tenantId}.log`), 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      
      // Write all logs with level `info` and below to tenant combined log
      new winston.transports.File({ 
        filename: path.join(logsDir, `combined-${tenantId}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      
      // Write to console in development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
}

// If we're not in production, log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
module.exports.createTenantLogger = createTenantLogger;