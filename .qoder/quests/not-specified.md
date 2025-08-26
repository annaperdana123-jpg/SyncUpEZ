# SyncUpEZ Implementation Design Document

## 1. Overview

SyncUpEZ is a simplified version of SyncUp that implements the Continuous Contribution Graph using only CSV files for data storage. This document outlines the complete design for implementing all remaining features as specified in the implementation plan.

The application provides REST APIs for employee management, interaction tracking, kudos system, contribution scoring, and analytics without requiring any databases.

## 2. Technology Stack & Dependencies

- **Runtime Environment**: Node.js
- **Web Framework**: Express.js
- **Data Storage**: CSV files
- **Dependencies**:
  - `express`: Web framework for REST APIs
  - `csv-parser`: Reading CSV files
  - `csv-writer`: Writing CSV files
  - `bcrypt`: Password hashing
  - `jsonwebtoken`: Authentication token generation

## 3. Architecture

```
src/
├── controllers/           # Request handlers
│   ├── authController.js
│   ├── employeeController.js
│   ├── interactionController.js
│   ├── kudosController.js
│   ├── contributionController.js
│   └── analyticsController.js
├── routes/               # API route definitions
│   ├── authRoutes.js
│   ├── employeeRoutes.js
│   ├── interactionRoutes.js
│   ├── kudosRoutes.js
│   ├── contributionRoutes.js
│   └── analyticsRoutes.js
├── services/             # Business logic
│   ├── scoringService.js
│   └── analyticsService.js
├── utils/                # Utility functions
│   ├── csvReader.js
│   └── csvWriter.js
└── data/                 # CSV data files
    ├── employees.csv
    ├── interactions.csv
    ├── kudos.csv
    └── contributions.csv
```

## 4. Component Architecture

### 4.1 Controllers

Controllers handle HTTP requests and responses, delegating business logic to services.

### 4.2 Routes

Routes define the API endpoints and map them to controller functions.

### 4.3 Services

Services contain the core business logic for scoring algorithms and analytics calculations.

### 4.4 Utilities

Utilities provide common functions for CSV file operations.

## 5. API Endpoints Reference

### 5.1 Authentication
- `POST /api/auth/login` - User login

### 5.2 Employee Management
- `POST /api/employees` - Create new employee
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID

### 5.3 Interaction Tracking
- `POST /api/interactions` - Create new interaction
- `GET /api/interactions` - Get all interactions
- `GET /api/interactions/employee/:id` - Get interactions by employee ID

#### Request/Response Schema

**POST /api/interactions**
```
// Request Body
{
  "employee_id": "string",
  "type": "string",
  "content": "string",
  "context_tags": "string" // comma-separated tags
}

// Response
{
  "message": "Interaction created successfully",
  "interaction": {
    "interaction_id": "string",
    "employee_id": "string",
    "type": "string",
    "content": "string",
    "timestamp": "datetime",
    "context_tags": "string"
  }
}
```

**GET /api/interactions**
```
// Response
[
  {
    "interaction_id": "string",
    "employee_id": "string",
    "type": "string",
    "content": "string",
    "timestamp": "datetime",
    "context_tags": "string"
  }
]
```

**GET /api/interactions/employee/:id**
```
// Response
[
  {
    "interaction_id": "string",
    "employee_id": "string",
    "type": "string",
    "content": "string",
    "timestamp": "datetime",
    "context_tags": "string"
  }
]
```

### 5.4 Kudos System
- `POST /api/kudos` - Give kudos to colleague
- `GET /api/kudos` - Get all kudos
- `GET /api/kudos/employee/:id` - Get kudos for employee

#### Request/Response Schema

**POST /api/kudos**
```
// Request Body
{
  "from_employee_id": "string",
  "to_employee_id": "string",
  "message": "string"
}

// Response
{
  "message": "Kudos created successfully",
  "kudos": {
    "kudos_id": "string",
    "from_employee_id": "string",
    "to_employee_id": "string",
    "message": "string",
    "timestamp": "datetime"
  }
}
```

**GET /api/kudos**
```
// Response
[
  {
    "kudos_id": "string",
    "from_employee_id": "string",
    "to_employee_id": "string",
    "message": "string",
    "timestamp": "datetime"
  }
]
```

**GET /api/kudos/employee/:id**
```
// Response
[
  {
    "kudos_id": "string",
    "from_employee_id": "string",
    "to_employee_id": "string",
    "message": "string",
    "timestamp": "datetime"
  }
]
```

### 5.5 Contribution Scores
- `POST /api/contributions` - Add contribution scores
- `GET /api/contributions` - Get all contribution scores
- `GET /api/contributions/employee/:id` - Get scores for employee

#### Request/Response Schema

**POST /api/contributions**
```
// Request Body
{
  "employee_id": "string",
  "problem_solving_score": "integer", // 0-100
  "collaboration_score": "integer", // 0-100
  "initiative_score": "integer", // 0-100
  "overall_score": "integer" // 0-100
}

// Response
{
  "message": "Contribution scores added successfully",
  "contribution": {
    "employee_id": "string",
    "date": "date",
    "problem_solving_score": "integer",
    "collaboration_score": "integer",
    "initiative_score": "integer",
    "overall_score": "integer"
  }
}
```

**GET /api/contributions**
```
// Response
[
  {
    "employee_id": "string",
    "date": "date",
    "problem_solving_score": "integer",
    "collaboration_score": "integer",
    "initiative_score": "integer",
    "overall_score": "integer"
  }
]
```

**GET /api/contributions/employee/:id**
```
// Response
[
  {
    "employee_id": "string",
    "date": "date",
    "problem_solving_score": "integer",
    "collaboration_score": "integer",
    "initiative_score": "integer",
    "overall_score": "integer"
  }
]
```

### 5.6 Analytics
- `GET /api/analytics/employees/:id` - Get metrics for specific employee
- `GET /api/analytics/employees/:id/history` - Get historical score trends
- `GET /api/analytics/teams/:teamId` - Get metrics for specific team
- `GET /api/analytics/departments/:deptId` - Get metrics for specific department
- `GET /api/analytics/stats` - Get overall statistics
- `GET /api/analytics/top-contributors` - Get top contributors

#### Request/Response Schema

**GET /api/analytics/employees/:id**
```
// Response
{
  "employee_id": "string",
  "name": "string",
  "current_scores": {
    "problem_solving_score": "integer",
    "collaboration_score": "integer",
    "initiative_score": "integer",
    "overall_score": "integer"
  },
  "team": "string",
  "department": "string"
}
```

**GET /api/analytics/employees/:id/history**
```
// Response
[
  {
    "date": "date",
    "problem_solving_score": "integer",
    "collaboration_score": "integer",
    "initiative_score": "integer",
    "overall_score": "integer"
  }
]
```

**GET /api/analytics/teams/:teamId**
```
// Response
{
  "team_id": "string",
  "team_name": "string",
  "average_scores": {
    "problem_solving_score": "number",
    "collaboration_score": "number",
    "initiative_score": "number",
    "overall_score": "number"
  },
  "member_count": "integer"
}
```

**GET /api/analytics/departments/:deptId**
```
// Response
{
  "department_id": "string",
  "department_name": "string",
  "average_scores": {
    "problem_solving_score": "number",
    "collaboration_score": "number",
    "initiative_score": "number",
    "overall_score": "number"
  },
  "team_count": "integer",
  "employee_count": "integer"
}
```

**GET /api/analytics/stats**
```
// Response
{
  "total_employees": "integer",
  "total_interactions": "integer",
  "total_kudos": "integer",
  "average_scores": {
    "problem_solving_score": "number",
    "collaboration_score": "number",
    "initiative_score": "number",
    "overall_score": "number"
  }
}
```

**GET /api/analytics/top-contributors**
```
// Response
[
  {
    "employee_id": "string",
    "name": "string",
    "overall_score": "integer",
    "department": "string",
    "team": "string"
  }
]
```

## 6. Data Models & Schema

### 6.1 Employee Model
```
employee_id: string (unique identifier)
name: string
email: string
password: string (hashed)
department: string
team: string
role: string
hire_date: date
```

### 6.2 Interaction Model
```
interaction_id: string (unique identifier)
employee_id: string (foreign key to employee)
type: string (e.g., "standup", "project_update", "help_request")
content: string
timestamp: datetime
context_tags: string (comma-separated tags)
```

### 6.3 Kudos Model
```
kudos_id: string (unique identifier)
from_employee_id: string (foreign key to employee)
to_employee_id: string (foreign key to employee)
message: string
timestamp: datetime
```

### 6.4 Contribution Score Model
```
employee_id: string (foreign key to employee)
date: date
problem_solving_score: integer (0-100)
collaboration_score: integer (0-100)
initiative_score: integer (0-100)
overall_score: integer (0-100)
```

## 7. Business Logic Layer

### 7.1 Contribution Scoring Service

#### Problem-Solving Detection Algorithm
1. Parse interaction content for problem-solving keywords
2. Count "asks" vs "answers" in interactions
3. Calculate problem-solving scores (0-100)

**Implementation Details:**
- Keywords for problem-solving: "problem", "issue", "solution", "resolve", "fix", "debug", "troubleshoot"
- Count questions ("how", "what", "why", "can you") vs answers (statements with solutions)
- Score calculation: (answers_count / (questions_count + answers_count)) * 100

#### Collaboration Measurement Algorithm
1. Count kudos received from different colleagues
2. Identify cross-functional recognition
3. Calculate collaboration scores (0-100)

**Implementation Details:**
- Count unique senders of kudos
- Identify kudos from different teams/departments
- Score calculation: (unique_senders_count * 10) + (cross_functional_kudos * 20), capped at 100

#### Initiative Detection Algorithm
1. Parse interaction content for initiative keywords
2. Identify self-started projects
3. Calculate initiative scores (0-100)

**Implementation Details:**
- Keywords for initiative: "proposal", "idea", "suggestion", "initiative", "started", "created", "built"
- Identify interactions with proactive language
- Score calculation: (initiative_keywords_count * 5) + (project_mentions * 10), capped at 100

### 7.2 Analytics Service

#### Individual Metrics
1. Retrieve contribution scores for specific employees
2. Provide historical score trends

**Implementation Details:**
- Fetch latest contribution scores for an employee
- Retrieve historical data for trend analysis
- Calculate improvement/decline rates

#### Team Aggregates
1. Calculate average scores for teams
2. Identify high-performing teams

**Implementation Details:**
- Group employees by team
- Calculate average scores per team
- Rank teams by overall performance

#### Department Metrics
1. Aggregate scores by department
2. Compare department performance

**Implementation Details:**
- Group teams by department
- Calculate department-wide averages
- Generate comparative reports

## 8. Middleware & Validation

### 8.1 Authentication Middleware
- Verify JWT tokens for protected routes
- Extract user information from tokens

**Implementation Details:**
- Check for Authorization header with Bearer token
- Verify token signature and expiration
- Attach user information to request object
- Return 401 for invalid or missing tokens

### 8.2 Data Validation
- Validate required fields in requests
- Check data types and formats
- Ensure referential integrity between entities

**Implementation Details:**
- Validate UUID format for employee IDs
- Check date formats for timestamps
- Verify required fields are present
- Validate score ranges (0-100)
- Check referential integrity (employee exists)

## 9. Implementation Timeline

### Phase 1: Interaction Tracking (2 days)
- Implement interactionController and interactionRoutes
- Add CSV headers for interactions.csv
- Create POST/GET endpoints for interactions

### Phase 2: Kudos System (2 days)
- Implement kudosController and kudosRoutes
- Add CSV headers for kudos.csv
- Create POST/GET endpoints for kudos

### Phase 3: Contribution Scoring (3 days)
- Implement scoringService
- Implement contributionController and contributionRoutes
- Add CSV headers for contributions.csv
- Create scoring algorithms

### Phase 4: Analytics API (3 days)
- Implement analyticsService
- Implement analyticsController and analyticsRoutes
- Create all analytics endpoints

### Phase 5: Testing & Validation (2 days)
- Unit testing for all components
- Integration testing for all endpoints
- Validate scoring algorithms
- Test edge cases

## 10. Testing Strategy

### 9.1 Unit Testing
- Test individual controller functions
- Validate service logic
- Verify CSV file operations

**Implementation Details:**
- Mock CSV file operations for controller tests
- Test error handling in all functions
- Validate input validation logic
- Test edge cases (empty files, missing data)

### 9.2 Integration Testing
- Test complete API endpoints
- Validate data flow between components
- Verify scoring algorithms produce expected results

**Implementation Details:**
- Test full request/response cycles
- Validate data persistence in CSV files
- Test authentication flow
- Verify proper HTTP status codes

### 9.3 Data Validation Testing
- Test CSV file creation and updates
- Validate data integrity across operations
- Check edge cases in file operations

**Implementation Details:**
- Test concurrent file access
- Validate CSV format consistency
- Test backup and recovery procedures
- Check data sanitization for special characters

## 11. Deployment & Monitoring

### 11.1 Deployment Process
- Package application with all dependencies
- Include sample CSV files with headers
- Provide deployment documentation
- Create startup scripts

### 11.2 Monitoring
- Log all API requests and responses
- Monitor file I/O operations
- Track error rates and response times
- Implement health check endpoints

## 12. Conclusion

This design document provides a comprehensive plan for implementing all remaining features in SyncUpEZ. The implementation will transform the basic employee management system into a full-featured Continuous Contribution Graph platform using only CSV files for data storage.

The modular architecture with clear separation of concerns ensures maintainability and scalability within the constraints of a CSV-based system. The phased implementation approach allows for incremental development and testing, reducing risks and enabling early validation of core concepts.

Key components include:
- Complete API endpoints for all entities (interactions, kudos, contributions, analytics)
- Sophisticated scoring algorithms for measuring problem-solving, collaboration, and initiative
- Comprehensive analytics for individual, team, and department metrics
- Robust validation and error handling
- Thorough testing strategy

The implementation timeline of 12 days provides a realistic schedule for completing all features while maintaining code quality and proper testing coverage.