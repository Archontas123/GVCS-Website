# Production Database Migration Fix

## Issue Description

The production database is missing critical schema updates from multiple migrations. This causes "Database error occurred" and "Internal server error" across multiple features.

### Affected Features

#### 1. Test Case Creation Error
- **Error**: Database error occurred
- **HTTP Status**: 500
- **Endpoint**: `POST /api/admin/problems/:id/testcases`
- **Root Cause**: The code tries to insert into columns (`input_parameters`, `expected_return`, `parameter_types`, `test_case_name`, `explanation`) that don't exist in the production database
- **Missing Migrations**: 003, 004

#### 2. Team Registration Error
- **Error**: Internal server error
- **HTTP Status**: 500
- **Endpoint**: `POST /api/team/register`
- **Root Cause**: The code tries to insert into columns (`contest_code`, `school_name`, `member_names`, `session_token`, `is_active`, `last_activity`) that don't exist in the production database
- **Missing Migrations**: 002

### What Went Wrong

The production database is missing several critical migrations:

**Migration 002** - Updates teams table:
- Adds `contest_code` (string)
- Adds `school_name` (string)
- Adds `member_names` (text/JSON)
- Adds `session_token` (string)
- Adds `is_active` (boolean)
- Adds `last_activity` (timestamp)
- Drops `contest_id` foreign key
- Renames `school` to `school_name_old`
- Renames `last_login` to `last_activity_old`

**Migration 003** - Adds LeetCode-style columns to `test_cases` table:
- `input_parameters` (jsonb)
- `expected_return` (jsonb)
- `parameter_types` (jsonb)
- `test_case_name` (text)
- `explanation` (text)
- `converted_to_params` (boolean)

**Migration 004** - Removes legacy test case columns:
- Drops `input` (text)
- Drops `expected_output` (text)

These migrations haven't been applied to the production database yet, causing multiple 500 errors.

## Solution

### Option 1: Run Migrations via Docker (Recommended)

SSH into your production server and run:

```bash
# Navigate to project directory
cd /opt/cs-club-hackathon

# Run migrations using the JavaScript script
sudo docker compose exec backend node scripts/run-migrations.js
```

### Option 2: Run Migrations via Shell Script

```bash
# Navigate to project directory
cd /opt/cs-club-hackathon

# Make script executable
chmod +x scripts/run-migrations.sh

# Run the migration script
./scripts/run-migrations.sh
```

### Option 3: Restart Backend Container (Migrations Auto-Run)

Migrations should run automatically on backend startup via `testConnection()` in `src/utils/db.js`. If they haven't run, try restarting the backend:

```bash
# Restart backend to trigger migrations
sudo docker compose restart backend

# Check logs to verify migrations ran
sudo docker compose logs backend | grep -i migration
```

## Verification

After running migrations, verify they were applied:

```bash
# Check migration status
sudo docker compose exec backend npx knex migrate:status --knexfile /app/knexfile.js
```

You should see migrations 003 and 004 in the "Completed" section.

## Testing the Fix

### Test 1: Team Registration

Try registering a new team:

```bash
curl -X POST https://hackthevalley.duckdns.org/api/team/register \
  -H "Content-Type: application/json" \
  -d '{
    "teamName": "Test Team",
    "contestCode": "T5JFKBHF",
    "password": "testpass123",
    "schoolName": "Test University",
    "members": [
      {"firstName": "John", "lastName": "Doe"},
      {"firstName": "Jane", "lastName": "Smith"}
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Team registered successfully",
  "data": {
    "teamId": 1,
    "teamName": "Test Team",
    "contestId": 1,
    "token": "..."
  }
}
```

### Test 2: Test Case Creation

Try creating a test case via the admin panel:

```bash
# Test the endpoint (replace 13 with your problem ID)
curl -X POST https://hackthevalley.duckdns.org/api/admin/problems/13/testcases \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_case_name": "Test Case 1",
    "input_parameters": {"nums": [1, 2], "target": 3},
    "expected_return": 3,
    "parameter_types": {"nums": "INT[]", "target": "INT"},
    "is_sample": true
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Test case created successfully",
  "data": { ... }
}
```

## Preventing This in the Future

The backend server automatically runs migrations on startup via `testConnection()` in `src/utils/db.js`. However, if migrations fail during startup, the error might be logged but not prevent the server from starting.

### Best Practices

1. **Always check migration status after deployment**:
   ```bash
   sudo docker compose exec backend npx knex migrate:status
   ```

2. **Monitor backend startup logs**:
   ```bash
   sudo docker compose logs backend | grep -E "(migration|Applied database)"
   ```

3. **Run migrations manually before deployment** if you have new migration files

## Rollback (If Needed)

If something goes wrong, you can rollback migrations:

```bash
# Rollback last batch
sudo docker compose exec backend npx knex migrate:rollback --knexfile /app/knexfile.js

# Rollback all migrations
sudo docker compose exec backend npx knex migrate:rollback --all --knexfile /app/knexfile.js
```

## Files Changed

- `scripts/run-migrations.sh` - Shell script to run migrations
- `backend/scripts/run-migrations.js` - Node.js script to run migrations
- `MIGRATION_FIX.md` - This documentation file

## Related Migrations

- `002_update_teams_table.js` - Updates teams table structure for new registration flow
- `003_leetcode_style_conversion.js` - Adds LeetCode-style columns to test_cases and problems
- `004_remove_legacy_test_case_fields.js` - Removes old `input` and `expected_output` columns

## Support

If the issue persists after running migrations:

1. Check backend logs: `sudo docker compose logs backend`
2. Verify database connection: `sudo docker compose exec backend node -e "require('./src/utils/db').testConnection()"`
3. Check migration table: `sudo docker compose exec postgres psql -U hackathon_user -d hackathon_db -c "SELECT * FROM knex_migrations ORDER BY id DESC LIMIT 10;"`
