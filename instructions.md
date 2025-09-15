# CS Club Programming Contest Platform - Windows Setup Instructions

This guide will help you set up and run the CS Club Programming Contest Platform on Windows from scratch.

## Prerequisites

Before you begin, you'll need to install the following software:

### 1. Install Node.js and npm

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the **LTS version** (currently requires Node.js ≥18.0.0)
3. Run the installer and follow the setup wizard
4. Verify installation by opening Command Prompt and running:
   ```cmd
   node --version
   npm --version
   ```

### 2. Install Git

1. Visit [git-scm.com](https://git-scm.com/download/win)
2. Download Git for Windows
3. Run the installer with default settings
4. Verify installation:
   ```cmd
   git --version
   ```

### 3. Install Docker Desktop

1. Visit [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Download Docker Desktop for Windows
3. Install and restart your computer
4. Start Docker Desktop and ensure it's running
5. Verify installation:
   ```cmd
   docker --version
   docker-compose --version
   ```

### 4. Install PostgreSQL (Optional - if not using Docker)

1. Visit [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Download the installer
3. Install with default settings, remember your password
4. Add PostgreSQL to your PATH if not done automatically

## Project Setup

### 1. Clone the Repository

1. Open Command Prompt or PowerShell
2. Navigate to where you want to store the project:
   ```cmd
   cd C:\Users\%USERNAME%\Documents
   mkdir Projects
   cd Projects
   ```
3. Clone the repository:
   ```cmd
   git clone <repository-url>
   cd CSCLUBWebsite
   ```

### 2. Install Dependencies

Install all project dependencies using npm workspaces:

```cmd
npm run install:all
```

This command will:
- Install root dependencies
- Install backend dependencies
- Install frontend dependencies

### 3. Environment Configuration

1. Copy the example environment file:
   ```cmd
   copy .env.example .env
   ```

2. Open `.env` in a text editor and configure the following essential settings:

   **Database Settings:**
   ```env
   DB_TYPE=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=programming_contest_db
   DB_USER=programming_contest_user
   DB_PASSWORD=your_secure_password
   ```

   **Security Settings:**
   ```env
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   ADMIN_PASSWORD=your-secure-admin-password
   ```

   **Application URLs:**
   ```env
   REACT_APP_API_URL=http://localhost:3000
   REACT_APP_WS_URL=ws://localhost:3000
   ```

### 4. Database Setup

You have two options for setting up the database:

#### Option A: Using Docker (Recommended)

1. Start the database services:
   ```cmd
   npm run docker:up
   ```

2. Wait for services to be healthy, then run migrations:
   ```cmd
   npm run db:migrate
   ```

#### Option B: Using Local PostgreSQL

1. Create a database user and database:
   ```sql
   CREATE USER programming_contest_user WITH PASSWORD 'your_secure_password';
   CREATE DATABASE programming_contest_db OWNER programming_contest_user;
   GRANT ALL PRIVILEGES ON DATABASE programming_contest_db TO programming_contest_user;
   ```

2. Update your `.env` file with local database settings:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   ```

3. Run database migrations:
   ```cmd
   npm run db:migrate
   ```

## Running the Application

### Development Mode

For development with hot-reload:

```cmd
npm run dev
```

This starts both backend and frontend concurrently:
- Backend: http://localhost:3000
- Frontend: http://localhost:3001 (or next available port)

### Production Mode

#### Using Docker (Recommended)

1. Build and start all services:
   ```cmd
   npm run docker:build
   npm run docker:up
   ```

2. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:3000

#### Using Node.js

1. Build the application:
   ```cmd
   npm run build
   ```

2. Start the services:
   ```cmd
   npm start
   ```

## Verification

### 1. Check Services

Verify all services are running:

```cmd
# Check if backend is responding
curl http://localhost:3000/api/health

# Check Docker containers (if using Docker)
docker ps
```

### 2. Access the Application

1. Open your web browser
2. Navigate to http://localhost (Docker) or the frontend port shown in terminal (Node.js)
3. You should see the contest platform login page

### 3. Admin Access

1. Navigate to `/admin` route
2. Use the admin password you set in the `.env` file
3. You should have access to the admin dashboard

## Database Management

### Running Migrations

```cmd
# Apply pending migrations
npm run db:migrate

# Check migration status
cd backend && npm run db:migrate:status

# Rollback last migration
npm run db:rollback
```

### Seeding Test Data

```cmd
npm run db:seed
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change ports in `.env` file
   - Or kill processes using the ports:
     ```cmd
     netstat -ano | findstr :3000
     taskkill /PID <process_id> /F
     ```

2. **Database Connection Failed**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify database exists

3. **Docker Issues**
   - Ensure Docker Desktop is running
   - Try restarting Docker Desktop
   - Clear Docker cache: `docker system prune`

4. **Node.js Version Issues**
   - Ensure you're using Node.js ≥18.0.0
   - Use nvm for Windows to manage Node versions

### Useful Commands

```cmd
# View application logs (Docker)
npm run docker:logs

# Stop all services (Docker)
npm run docker:down

# Clean install (if having dependency issues)
npm run clean
npm run install:all

# Run tests
npm test

# Database reset (WARNING: Deletes all data)
npm run db:reset
```

## Development Workflow

1. Start development environment: `npm run dev`
2. Make your changes to the codebase
3. The application will automatically reload
4. Run tests: `npm test`
5. Check database changes: `npm run db:migrate:status`

## Project Structure

```
CSCLUBWebsite/
├── backend/          # Express.js API server
├── frontend/         # React.js client application
├── scripts/          # Setup and utility scripts
├── docker-compose.yml # Docker services configuration
├── package.json      # Root package configuration
└── .env             # Environment variables
```

## Next Steps

1. **Configure Contest Settings**: Update contest duration and rules in the admin panel
2. **Set Up Problems**: Add programming problems through the admin interface
3. **Team Registration**: Enable team registration if needed
4. **Monitor Performance**: Check logs and system performance during contests

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs
3. Ensure all prerequisites are properly installed
4. Verify environment configuration

For additional help, contact the development team or refer to the project documentation.