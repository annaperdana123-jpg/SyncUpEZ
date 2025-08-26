# SyncUpEZ Initial Commit Documentation

## 1. Overview

SyncUpEZ is a simplified, CSV-based implementation of the SyncUp Continuous Contribution Graph platform. It provides a lightweight SaaS solution for tracking employee interactions, kudos, and contribution scores without requiring complex database infrastructure.

### Key Features
- Employee Management
- Interaction Tracking
- Kudos System
- Contribution Scoring
- Analytics Engine
- Multi-tenancy Support
- JWT-based Authentication

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Data Storage**: CSV files (no databases)
- **Authentication**: JWT with bcrypt password hashing
- **Logging**: Winston
- **Testing**: Jest

## 2. Architecture

The application follows a modular architecture with clear separation of concerns:

```
src/
├── controllers/     # HTTP request/response handlers
├── middleware/      # Authentication, validation, and tenant resolution
├── routes/          # API endpoint definitions
├── services/        # Business logic implementations
└── utils/          # Common utilities (CSV operations, logging)
```

### Core Components

#### Multi-Tenancy System
- Tenant identification via subdomain, API key, or X-Tenant-ID header
- Data isolation enforced through middleware
- Per-tenant data stored in separate directories

#### Authentication & Security
- Password hashing with bcrypt
- JWT-based token authentication
- Role-based access control
- Input validation and sanitization

#### Data Layer
- All data stored in CSV files
- Thread-safe file operations using proper-lockfile
- Separate data directories per tenant
- Automatic backup system

## 3. API Endpoints Reference

### Authentication
- `POST /api/auth/login` - User login

### Employee Management
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee

### Interaction Management
- `GET /api/interactions` - Get all interactions
- `GET /api/interactions/employee/:id` - Get interactions by employee ID
- `POST /api/interactions` - Create new interaction

### Kudos System
- `GET /api/kudos` - Get all kudos
- `GET /api/kudos/employee/:id` - Get kudos for employee
- `POST /api/kudos` - Give kudos to colleague

### Contribution Scoring
- `GET /api/contributions` - Get all contribution scores
- `GET /api/contributions/employee/:id` - Get scores for employee
- `POST /api/contributions` - Add contribution scores

### Analytics Engine
- `GET /api/analytics/employees/:id` - Get metrics for specific employee
- `GET /api/analytics/employees/:id/history` - Get historical score trends
- `GET /api/analytics/teams/:teamId` - Get metrics for specific team
- `GET /api/analytics/departments/:deptId` - Get metrics for specific department
- `GET /api/analytics/stats` - Get overall statistics
- `GET /api/analytics/top-contributors` - Get top contributors

### Backup Management
- `GET /api/backups` - List available backups
- `POST /api/backups` - Create new backup
- `POST /api/backups/restore/:filename` - Restore from backup

### Tenant Management
- `GET /api/tenants` - Get tenant information

### Dashboard
- `GET /api/dashboard` - Get dashboard data

## 4. Data Models

### Employee
```
employee_id,name,email,password,department,team,role,hire_date
```

### Interaction
```
interaction_id,from_employee_id,to_employee_id,date,type,content
```

### Kudos
```
kudos_id,from_employee_id,to_employee_id,date,message
```

### Contribution Score
```
employee_id,date,score,problem_solving_score,collaboration_score,initiative_score
```

## 5. Business Logic

### Contribution Scoring Algorithm
1. **Problem-Solving Detection**: Analyzes interaction content for problem-solving keywords and question/answer ratios
2. **Collaboration Measurement**: Counts kudos received from different colleagues and cross-functional recognition
3. **Initiative Detection**: Identifies proactive language and self-started projects in interactions

All scores are calculated on a scale of 0-100 and combined into an overall contribution score using weighted averages.

### Data Isolation
Each tenant's data is stored in separate directories to ensure complete data isolation. Middleware enforces that requests can only access data belonging to their identified tenant.

## 6. Middleware & Validation

### Authentication Middleware
- Validates JWT tokens
- Ensures tenant context matches token claims
- Returns 401 for invalid tokens

### Tenant Resolution Middleware
- Identifies tenant from subdomain, API key, or header
- Sets tenant context for request processing

### Data Isolation Middleware
- Ensures requests can only access data from their tenant
- Prevents cross-tenant data access

### Validation Middleware
- Sanitizes and validates input data
- Provides consistent error responses

### Logging Middleware
- Tracks all requests with unique IDs
- Logs request/response details for debugging

### Error Handling Middleware
- Centralized error handling
- Consistent error response format
- Proper error logging

## 7. Testing Strategy

### Unit Testing
- Comprehensive tests for all services
- Middleware validation tests
- CSV utility function tests

### Integration Testing
- End-to-end tests for all API endpoints
- Multi-tenancy isolation verification
- Authentication flow testing

### Performance Testing
- Concurrent request handling
- CSV file operation performance
- Response time measurements

### Security Testing
- Tenant data isolation verification
- Authentication token validation
- Input sanitization testing

## 8. Deployment Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: Secret for JWT token signing
- `BACKUP_INTERVAL`: Backup interval in minutes (default: 60)
- `LOG_LEVEL`: Logging level (default: info)

### Directory Structure
```
project/
├── data/           # Tenant data directories
├── backups/        # Backup files
├── logs/           # Application logs
├── src/            # Source code
└── test/           # Test files
```

### Startup Process
1. Load environment variables
2. Initialize logging system
3. Start Express server
4. Schedule automatic backups
5. Register graceful shutdown handlers

### Graceful Shutdown
- Stops scheduled backups
- Closes server connections
- Flushes logs before exit