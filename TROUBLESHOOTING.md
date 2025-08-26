# SyncUpEZ Troubleshooting Guide

This document provides solutions for common issues you might encounter when installing, setting up, or running SyncUpEZ.

## Common Issues and Solutions

### 1. Port Already in Use

**Problem**: When starting the server, you see an error like:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**: 
1. Change the PORT in your `.env` file to an available port:
   ```
   PORT=3001
   ```
2. Alternatively, stop the process using the port:
   ```bash
   # Find the process using port 3000
   lsof -i :3000
   
   # Kill the process (replace PID with the actual process ID)
   kill -9 PID
   ```

### 2. Permission Errors

**Problem**: You see errors related to file or directory permissions when the application tries to read or write CSV files.

**Solution**:
1. Ensure the application has read/write permissions to the data directory:
   ```bash
   chmod -R 755 data/
   ```
2. If running in a production environment, make sure the user running the application has appropriate permissions to the data directory.

### 3. Missing Environment Variables

**Problem**: The application fails to start with errors about missing configuration values.

**Solution**:
1. Ensure you have created a `.env` file from the `.env.local` template:
   ```bash
   cp .env.local .env
   ```
2. Verify that all required environment variables are set:
   - `DATA_PATH`: Path to the directory where CSV data files are stored
   - `JWT_SECRET`: Secret key used for signing JSON Web Tokens
   - `PORT`: Port on which the server will listen
   - `LOG_LEVEL`: Minimum level of logs to output

### 4. Tests Failing

**Problem**: Some tests are failing when running `npm test`.

**Solution**:
1. Make sure all dependencies are installed:
   ```bash
   npm install
   ```
2. Check if there are any specific test failures and address them individually.
3. Some performance tests may fail in environments with limited resources. These failures don't necessarily indicate issues with the application functionality.

### 5. Multi-tenancy Issues

**Problem**: Data from different tenants appears to be mixed or inaccessible.

**Solution**:
1. Verify that the tenant middleware is correctly configured to identify tenants from:
   - Subdomain (e.g., company.syncup.com)
   - X-Tenant-ID header (for testing)
   - x-tenant-api-key header
2. Check that the data isolation middleware is properly creating and using tenant-specific directories.

### 6. Backup System Issues

**Problem**: Backups are not being created or restored properly.

**Solution**:
1. Verify that the backup directory exists and is writable:
   ```bash
   ls -la backups/
   ```
2. Check the backup schedule configuration in the code (default is every 60 minutes).
3. Ensure there's sufficient disk space for backups.

### 7. Authentication Issues

**Problem**: Users are unable to authenticate or receive token errors.

**Solution**:
1. Verify that the JWT_SECRET in your `.env` file is set correctly.
2. For production deployments, ensure you're using a strong, random JWT_SECRET.
3. Check that the tenant ID in the token matches the tenant ID in the request.

## Logs

Application logs are written to the console and to files in the `logs/` directory. Check these logs for error messages and debugging information:
- `logs/error.log`: Contains all error-level logs
- `logs/combined.log`: Contains all logs at info level and above
- Tenant-specific logs are also created in the same directory

## Security Considerations

1. Always use a strong, random `JWT_SECRET` in production environments
2. Ensure proper file permissions on the data directory
3. Regularly backup your data files
4. Monitor logs for suspicious activity

If you continue to experience issues not covered in this guide, please check the application logs for more detailed error information or open an issue in the GitHub repository.