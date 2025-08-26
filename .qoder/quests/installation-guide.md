# SyncUpEZ Installation and Setup Guide

## Overview

This guide provides detailed instructions for installing and setting up SyncUpEZ, a lightweight CSV-based implementation of the SyncUp Continuous Contribution Graph platform. SyncUpEZ uses only CSV files for data storage, making it ideal for small teams and proof-of-concept deployments without database dependencies.

## Prerequisites

Before installing SyncUpEZ, ensure your system meets the following requirements:

- Node.js version 14.x or higher
- npm (Node Package Manager) version 6.x or higher
- Git (for cloning the repository)
- At least 100MB of available disk space

## Project Structure

The SyncUpEZ project follows a standard Node.js application structure with additional organization for multi-tenancy:

```
.
├── backups/                 # Automated backup storage
├── data/                    # CSV data files
│   ├── default/             # Default tenant data directory
│   ├── contributions.csv    # Global contributions data
│   ├── employees.csv        # Global employees data
│   ├── interactions.csv     # Global interactions data
│   └── kudos.csv            # Global kudos data
├── logs/                    # Application logs
├── scripts/                 # Utility scripts
├── src/                     # Source code
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
├── test/                    # Test files
├── .env.local               # Local environment configuration
├── .env.test                # Test environment configuration
├── package.json             # Node.js dependencies and scripts
└── server.js                # Main application entry point
```

## Installation Steps

### 1. Clone the Repository

Clone the SyncUpEZ repository to your local machine:

```bash
git clone https://github.com/thomasperdana/SyncUp.git
cd SyncUp
```

### 2. Install Dependencies

Install the required Node.js packages using npm:

```bash
npm install
```

This command will install all dependencies listed in the `package.json` file, including:
- Express.js for the web framework
- bcrypt for password hashing
- jsonwebtoken for authentication token management
- csv-parser and csv-writer for CSV file operations
- winston for logging
- proper-lockfile for file locking mechanisms

### 3. Environment Configuration

SyncUpEZ requires environment variables to be configured. Create a `.env` file in the project root based on the provided `.env.local` template:

```bash
cp .env.local .env
```

The following environment variables need to be configured:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `DATA_PATH` | Path to the directory where CSV data files are stored | `./data` |
| `JWT_SECRET` | Secret key used for signing JSON Web Tokens | `syncup_secret_key_for_multitenancy` |
| `PORT` | Port on which the server will listen | `3000` |
| `LOG_LEVEL` | Minimum level of logs to output (error, warn, info, debug) | `info` |

For development, you can use the existing `.env.local` file as is. For production deployments, ensure you change the `JWT_SECRET` to a secure random string.

### 4. Data Directory Structure

SyncUpEZ uses a specific directory structure for storing data:

```
data/
├── contributions.csv
├── employees.csv
├── interactions.csv
├── kudos.csv
└── default/
    ├── contributions.csv
    ├── employees.csv
    ├── interactions.csv
    └── kudos.csv
```

The root CSV files contain global data, while tenant-specific data is stored in subdirectories. The `default` tenant directory is created automatically if it doesn't exist.

Initial data files are included in the repository for demonstration purposes.

## Running the Application

### Development Mode

To run the application in development mode with auto-restart on file changes:

```bash
npm run dev
```

### Production Mode

To run the application in production mode:

```bash
npm start
```

By default, the server will start on port 3000. You can access the application at `http://localhost:3000`.

## Testing

SyncUpEZ includes a comprehensive test suite with both unit and integration tests. The tests are organized to verify all aspects of the application including:
- Unit tests for individual services and middleware components
- Integration tests for complete API endpoints
- Multi-tenancy isolation tests
- CSV data integrity tests
- Backup and restore functionality tests
- Performance tests under load

To run all tests:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

To generate a test coverage report:

```bash
npm run test:coverage
```

Test data is managed through a centralized test data factory that generates consistent mock data with unique identifiers for test isolation. Tests use timestamps to ensure unique identifiers for each test run, preventing data conflicts.

## API Endpoints

Once the server is running, the following API endpoints are available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | GET | Server status check |
| `/api/auth/*` | Various | Authentication endpoints |
| `/api/employees/*` | Various | Employee management |
| `/api/interactions/*` | Various | Interaction tracking |
| `/api/kudos/*` | Various | Kudos system |
| `/api/contributions/*` | Various | Contribution scoring |
| `/api/analytics/*` | Various | Analytics data |
| `/api/backups/*` | Various | Backup management |
| `/api/tenants/*` | Various | Tenant management |
| `/api/dashboard/*` | Various | Dashboard data |

## Backup System

SyncUpEZ includes an automated backup system that creates backups of all CSV data files. By default, backups are scheduled to run every 60 minutes. Backups are stored in the `backups/` directory with timestamped filenames.

The backup system provides several features:
- **Automatic Backups**: Scheduled backups of all CSV files
- **Manual Backups**: API endpoint for creating backups on demand (`POST /api/backups/create`)
- **Backup Restoration**: Restore data from backups via API (`POST /api/backups/restore`)
- **Backup Verification**: Verify backup integrity using MD5 checksums (`POST /api/backups/verify`)
- **Backup Cleanup**: Automatic removal of backups older than 7 days

Backups are stored with the naming convention: `{original_filename}.backup-{timestamp}`

## Multi-tenancy

SyncUpEZ supports multi-tenancy through the tenant middleware system. Each tenant's data is isolated in separate directories under the main data directory. The tenant is identified through the request context, ensuring data security and separation.

## Troubleshooting

### Common Issues

1. **Port already in use**: If you see an error about the port being in use, change the `PORT` environment variable to an available port.

2. **Permission errors**: Ensure the application has read/write permissions to the data directory and its contents.

3. **Missing environment variables**: Ensure all required environment variables are set in your `.env` file.

### Logs

Application logs are written to the console and to files in the `logs/` directory. Check these logs for error messages and debugging information.

## Security Considerations

1. Always use a strong, random `JWT_SECRET` in production environments
2. Ensure proper file permissions on the data directory
3. Regularly backup your data files
4. Monitor logs for suspicious activity

## Updating the Application

To update SyncUpEZ to the latest version:

1. Pull the latest changes from the repository:
   ```bash
   git pull origin main
   ```

2. Install any new dependencies:
   ```bash
   npm install
   ```

3. Restart the application:
   ```bash
   npm start
   ```