# SyncUpEZ

A simplified version of SyncUp that implements the Continuous Contribution Graph using Supabase PostgreSQL database for data storage.

## Features

- Employee Management
- Interaction Tracking
- Kudos System
- Contribution Scoring
- Analytics API
- Multi-tenancy Support
- Row Level Security (RLS) for data isolation

## Technology Stack

- Node.js
- Express.js
- Supabase (PostgreSQL database)
- Supabase Auth for authentication

## Setup

1. Clone the repository
2. Create a Supabase project at https://supabase.com/
3. Set up your Supabase credentials in `.env` and `.env.local`:
   ```
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_KEY="your-anon-or-service-key"
   ```
4. Run `npm install`
5. Initialize the database schema: `npm run supabase:init`
6. (Optional) Migrate existing CSV data: `npm run supabase:migrate`
7. Run `npm start`

The server will start on port 3000.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/register` - Register new user

### Employee Management
- `GET /api/employees` - Get all employees (paginated)
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Interactions
- `GET /api/interactions` - Get all interactions
- `GET /api/interactions/employee/:id` - Get interactions by employee
- `POST /api/interactions` - Create new interaction

### Kudos
- `GET /api/kudos` - Get all kudos
- `GET /api/kudos/employee/:id` - Get kudos by employee
- `POST /api/kudos` - Give kudos to colleague

### Contributions
- `GET /api/contributions` - Get all contribution scores
- `GET /api/contributions/employee/:id` - Get scores by employee
- `POST /api/contributions` - Add contribution scores

### Analytics
- `GET /api/analytics/employees/:id` - Get metrics for specific employee
- `GET /api/analytics/employees/:id/history` - Get historical score trends
- `GET /api/analytics/teams/:teamId` - Get metrics for specific team
- `GET /api/analytics/departments/:deptId` - Get metrics for specific department
- `GET /api/analytics/stats` - Get overall statistics
- `GET /api/analytics/top-contributors` - Get top contributors