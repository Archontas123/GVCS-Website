-- This script initializes the database with basic settings

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone 
SET timezone = 'UTC';

-- Basic database initialization complete
-- Tables will be created by the application migrations

SELECT 'Database initialized successfully' as status;