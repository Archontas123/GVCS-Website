-- Hackathon Platform Database Initialization
-- This script initializes the database with basic settings

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone (adjust as needed)
SET timezone = 'UTC';

-- Basic database initialization complete
-- Tables will be created by the application migrations

SELECT 'Database initialized successfully' as status;