# Database Setup Guide

This document explains how to set up and manage the database for the Hackathon Platform.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm installed

## Quick Setup

1. **Start Database Containers**
   ```bash
   ./setup-database.sh
   # or manually:
   docker-compose up -d
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

4. **Seed Test Data**
   ```bash
   npm run db:seed
   ```

5. **Test Connection**
   ```bash
   npm run db:test
   ```

## Database Schema

### Core Tables

1. **admins** - Platform administrators
   - `id`, `username`, `email`, `password_hash`, `role`, `created_at`

2. **contests** - Contest definitions
   - `id`, `contest_name`, `description`, `registration_code`, `start_time`, `duration`, `freeze_time`, etc.

3. **teams** - Registered teams
   - `id`, `team_name`, `contest_code`, `session_token`, `registered_at`, `last_activity`, `is_active`

4. **problems** - Contest problems
   - `id`, `contest_id`, `problem_letter`, `title`, `description`, `input_format`, `output_format`, etc.

5. **test_cases** - Problem test cases
   - `id`, `problem_id`, `input`, `expected_output`, `is_sample`

6. **submissions** - Team code submissions
   - `id`, `team_id`, `problem_id`, `language`, `code`, `status`, `submission_time`, etc.

7. **team_contests** - Team contest registrations (junction table)
   - `team_id`, `contest_id`, `registered_at`

8. **contest_results** - Team contest results and rankings
   - `id`, `contest_id`, `team_id`, `problems_solved`, `penalty_time`, `rank`, etc.

### Database Indexes

Optimized indexes are automatically created for:
- Primary keys and foreign keys
- Frequently queried columns (contest_code, submission_time, etc.)
- Composite indexes for complex queries (ranking, team submissions, etc.)

## Available Scripts

### Migration Commands
- `npm run db:migrate` - Run all pending migrations
- `npm run db:migrate:rollback` - Rollback the last migration
- `npm run db:migrate:status` - Check migration status
- `npm run db:migrate:make <name>` - Create a new migration file

### Seed Commands
- `npm run db:seed` - Run all seed files
- `npm run db:reset` - Rollback all migrations, re-migrate, and seed
- `npm run db:fresh` - Alias for db:reset

### Utility Commands
- `npm run db:test` - Test database connection
- `npm run db:setup` - Start Docker containers

## Sample Data

The seed file creates:
- 1 admin user (username: `admin`, password: `password123`)
- 1 sample contest (`SAMPLE2024`)
- 3 problems (A, B, C) with varying difficulty
- 7 test cases across all problems
- 3 sample teams registered for the contest

## Migration Details

### Migration 001: Core Tables
Creates all primary tables with proper relationships and basic indexes.

### Migration 002: Performance Indexes  
Adds composite indexes for optimal query performance:
- Submission filtering and sorting
- Contest result rankings
- Problem and test case lookups

## Environment Variables

Required in `.env` file:
```env
DATABASE_URL=postgresql://hackathon_user:hackathon_password@localhost:5432/hackathon_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hackathon_db
DB_USER=hackathon_user
DB_PASSWORD=hackathon_password
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure PostgreSQL container is running: `docker ps`
   - Restart containers: `docker-compose restart`

2. **Migration Errors**
   - Check migration status: `npm run db:migrate:status`
   - Rollback and retry: `npm run db:migrate:rollback && npm run db:migrate`

3. **Permission Denied**
   - Make setup script executable: `chmod +x setup-database.sh`

### Reset Everything
```bash
docker-compose down -v  # Remove containers and volumes
npm run db:setup        # Restart containers
npm run db:migrate      # Run migrations
npm run db:seed         # Add sample data
```

## Production Notes

- Change default passwords in `.env`
- Update JWT secrets
- Consider connection pooling settings
- Set up proper backup procedures
- Monitor database performance and tune indexes as needed