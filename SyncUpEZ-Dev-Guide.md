# SyncUpEZ App Development Guide

## Overview

SyncUpEZ is a simplified version of SyncUp that implements the Continuous Contribution Graph using only CSV files for data storage. This guide provides step-by-step instructions for developers to build the core functionality without complex dependencies.

## Key Features

1. **Employee Management**: Store and manage employee information
2. **Interaction Tracking**: Capture daily workplace interactions (posts, stand-ups, project updates)
3. **Kudos System**: Enable peer recognition and appreciation
4. **Contribution Scoring**: Calculate and store contribution metrics
5. **Analytics API**: Expose contribution metrics via API

## Technology Stack

- **Runtime**: Node.js
- **Storage**: CSV files (no databases)
- **File Format**: Standard CSV with headers
- **Web Framework**: Express.js (simple REST API)
- **No**: AI, GraphQL, databases, or complex libraries

## CSV File Structure

### employees.csv
```
employee_id,name,email,department,team,role,hire_date
```

### interactions.csv
```
interaction_id,employee_id,type,content,timestamp,context_tags
```

### kudos.csv
```
kudos_id,from_employee_id,to_employee_id,message,timestamp
```

### contributions.csv
```
employee_id,date,problem_solving_score,collaboration_score,initiative_score,overall_score
```

## Core Implementation Steps

### 1. Project Setup

1. Create a new Node.js project:
   ```bash
   mkdir SyncUpEZ
   cd SyncUpEZ
   npm init -y
   ```

2. Install minimal dependencies:
   ```bash
   npm install express csv-parser csv-writer
   ```

3. Create the main server file (server.js)

### 2. CSV File Management

Implement simple file I/O operations:

1. **Reading CSV files**:
   - Load entire file into memory
   - Parse CSV data into JavaScript objects

2. **Writing CSV files**:
   - Convert objects to CSV format
   - Write entire file (or append new rows)

3. **Data validation**:
   - Check required fields
   - Validate data types and formats

### 3. REST API Endpoints

Create simple endpoints for each entity:

#### Employee Management
- `POST /api/employees` - Add new employee
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee by ID

#### Interaction Tracking
- `POST /api/interactions` - Create new interaction
- `GET /api/interactions` - List all interactions
- `GET /api/interactions/employee/:id` - Get interactions by employee

#### Kudos System
- `POST /api/kudos` - Give kudos to colleague
- `GET /api/kudos` - List all kudos
- `GET /api/kudos/employee/:id` - Get kudos for employee

#### Contribution Scores
- `POST /api/contributions` - Add contribution scores
- `GET /api/contributions` - Get all contribution scores
- `GET /api/contributions/employee/:id` - Get scores for employee

### 4. Continuous Contribution Graph Logic

Implement simple batch processing functions:

#### Quantifying Problem-Solving
1. Parse interaction content for problem-solving keywords
2. Count "asks" vs "answers" in interactions
3. Calculate problem-solving scores (0-100)

#### Measuring Collaboration
1. Count kudos received from different colleagues
2. Identify cross-functional recognition
3. Calculate collaboration scores (0-100)

#### Visualizing Initiative
1. Parse interaction content for initiative keywords
2. Identify self-started projects
3. Calculate initiative scores (0-100)

### 5. Analytics API Implementation

Create functions to expose contribution data via API:

#### Individual Metrics
1. Retrieve contribution scores for specific employees
2. Provide historical score trends

#### Team Aggregates
1. Calculate average scores for teams
2. Identify high-performing teams

## Simple Implementation Examples

### Reading Employees from CSV
```javascript
const fs = require('fs');
const csv = require('csv-parser');

function getEmployees() {
  return new Promise((resolve, reject) => {
    const employees = [];
    fs.createReadStream('employees.csv')
      .pipe(csv())
      .on('data', (row) => employees.push(row))
      .on('end', () => resolve(employees))
      .on('error', reject);
  });
}
```

### Writing Interaction to CSV
```javascript
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function addInteraction(interaction) {
  const csvWriter = createCsvWriter({
    path: 'interactions.csv',
    header: [
      {id: 'interaction_id', title: 'interaction_id'},
      {id: 'employee_id', title: 'employee_id'},
      {id: 'type', title: 'type'},
      {id: 'content', title: 'content'},
      {id: 'timestamp', title: 'timestamp'},
      {id: 'context_tags', title: 'context_tags'}
    ],
    append: true
  });
  
  await csvWriter.writeRecords([interaction]);
}
```

### Calculating Contribution Scores
```javascript
function calculateContributionScores(employees, interactions, kudos) {
  return employees.map(employee => {
    // Simple scoring algorithm
    const employeeInteractions = interactions.filter(i => i.employee_id === employee.employee_id);
    const employeeKudos = kudos.filter(k => k.to_employee_id === employee.employee_id);
    
    const problemSolvingScore = calculateProblemSolving(employeeInteractions);
    const collaborationScore = calculateCollaboration(employeeKudos);
    const initiativeScore = calculateInitiative(employeeInteractions);
    const overallScore = Math.round((problemSolvingScore + collaborationScore + initiativeScore) / 3);
    
    return {
      employee_id: employee.employee_id,
      date: new Date().toISOString().split('T')[0],
      problem_solving_score: problemSolvingScore,
      collaboration_score: collaborationScore,
      initiative_score: initiativeScore,
      overall_score: overallScore
    };
  });
}
```

## Deployment

1. Ensure Node.js is installed on the target system
2. Copy all files to the server
3. Run `npm install` to install dependencies
4. Start the application with `node server.js`
5. CSV files will be created automatically in the same directory

## Limitations & Considerations

1. **Scalability**: Suitable for small to medium teams (up to 100 employees)
2. **Concurrency**: Basic file locking recommended for multi-user environments
3. **Performance**: Entire files loaded into memory for each operation
4. **Data Integrity**: No transaction support; backup files regularly
5. **Security**: No authentication; implement as needed for your environment

## Next Steps

1. Implement the basic server and API endpoints
2. Create functions for CSV file operations
3. Develop the contribution scoring algorithms
4. Implement the analytics API endpoints
5. Test with sample data
6. Deploy and monitor usage