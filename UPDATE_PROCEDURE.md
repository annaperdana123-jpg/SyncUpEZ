# SyncUpEZ Update Procedure

This document outlines the steps to update SyncUpEZ to the latest version.

## Prerequisites

Before updating, ensure you have:
- A backup of your data directory
- A backup of your environment configuration
- Sufficient disk space for the update

## Update Steps

### 1. Backup Current Installation

Before updating, create a backup of your current installation:

```bash
# Create a backup of the data directory
cp -r data/ data-backup-$(date +%Y%m%d)

# Create a backup of the environment configuration
cp .env .env-backup-$(date +%Y%m%d)
```

### 2. Pull Latest Changes

Pull the latest changes from the repository:

```bash
git pull origin main
```

### 3. Install New Dependencies

Install any new dependencies that may have been added:

```bash
npm install
```

### 4. Update Environment Variables

Check if there are any new environment variables required:

```bash
# Compare your current .env with the template
diff .env .env.local
```

Update your `.env` file with any new variables as needed.

### 5. Run Database Migrations (if applicable)

For SyncUpEZ, this step involves checking if there are any changes to the CSV file formats:

1. Check the documentation for any changes to the CSV schema
2. If needed, update your existing CSV files to match the new format

### 6. Restart the Application

Stop the current application and start the updated version:

```bash
# If running in production
npm start

# If running in development
npm run dev
```

### 7. Verify the Update

1. Check that the application starts without errors
2. Verify that all API endpoints are working correctly
3. Test core functionality like employee management, authentication, and data access
4. Run the test suite to ensure everything is working:
   ```bash
   npm test
   ```

## Rollback Procedure

If you encounter issues after updating, you can rollback to the previous version:

### 1. Stop the Application

```bash
# Find and stop the running process
lsof -i :3000
kill -9 PID
```

### 2. Revert to Previous Version

```bash
# If you committed your changes, you can revert
git reset --hard HEAD~1

# Or checkout a specific commit
git checkout COMMIT_HASH
```

### 3. Restore Backup (if needed)

```bash
# Restore data directory from backup
rm -rf data/
cp -r data-backup-YYYYMMDD data/

# Restore environment configuration
cp .env-backup-YYYYMMDD .env
```

### 4. Reinstall Dependencies

```bash
npm install
```

### 5. Restart the Application

```bash
npm start
```

## Important Notes

- Always test updates in a staging environment before applying to production
- Monitor application logs after updating for any errors or warnings
- Keep a record of the versions you're updating from and to
- If you've made custom modifications to the code, you may need to reapply them after updating

## Version Information

To check your current version:

```bash
# Check git commit
git log -1 --oneline

# Check package version
npm list | grep syncup-ez
```

For any issues during the update process, please refer to the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) guide or open an issue in the GitHub repository.