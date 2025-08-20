# School Algorithmic Hackathon Platform

An ICPC-style competitive programming platform designed for school hackathons and coding contests.

## Features

- **ICPC Scoring System** - Authentic competitive programming scoring with penalty time
- **Real-time Leaderboard** - Live rankings with WebSocket updates
- **Multi-language Support** - Real C++, Java, Python code compilation and execution
- **Team-based Registration** - Simple team registration with contest codes
- **Real Code Execution** - Native compiler/interpreter execution (no mocking)
- **Admin Dashboard** - Contest and problem management interface

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Database Setup

1. **Start the database services:**
   ```bash
   ./setup-database.sh
   ```

2. **Test database connection:**
   ```bash
   npm install
   npm run db:test
   ```

### Manual Database Setup (Alternative)

If you prefer to set up PostgreSQL manually:

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create user and database
sudo -u postgres psql
postgres=# CREATE USER hackathon_user WITH PASSWORD 'hackathon_password';
postgres=# CREATE DATABASE hackathon_db OWNER hackathon_user;
postgres=# GRANT ALL PRIVILEGES ON DATABASE hackathon_db TO hackathon_user;
postgres=# \q
```

## Windows Setup (Recommended)

For Windows users, we provide automated setup scripts that install all required compilers and tools:

### Option 1: PowerShell Script (Recommended)
```powershell
# Run PowerShell as Administrator, then:
cd scripts
.\setup-windows.ps1
```

### Option 2: Batch Script  
```cmd
# Run Command Prompt as Administrator, then:
cd scripts
setup-windows.bat
```

### What Gets Installed:
- **Chocolatey** - Windows package manager
- **Node.js & npm** - JavaScript runtime and package manager  
- **Git** - Version control system
- **Python 3.x** - Python interpreter for code execution
- **MinGW (GCC)** - C++ compiler for code compilation
- **OpenJDK** - Java compiler (javac) for Java code execution

### Manual Installation (Alternative)
If you prefer manual installation:

```powershell
# Install Chocolatey first
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install compilers
choco install mingw openjdk -y
```

### Environment Configuration

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Update configuration if needed:**
   ```bash
   nano .env
   ```

### Database Connection

The default connection settings are:

- **Host:** localhost
- **Port:** 5432
- **Database:** hackathon_db
- **Username:** hackathon_user
- **Password:** hackathon_password
- **Connection URL:** `postgresql://hackathon_user:hackathon_password@localhost:5432/hackathon_db`

## Development Scripts

```bash
# Install dependencies
npm install

# Test database connection
npm run db:test

# Setup database with Docker
npm run db:setup

# Start development server
npm run dev

# Run tests
npm test
```

## Project Structure

```
hackathon-platform/
├── docker-compose.yml          # Docker services configuration
├── package.json               # Node.js dependencies and scripts
├── .env.example              # Environment configuration template
├── setup-database.sh         # Database setup script
├── test-db-connection.js     # Database connection test
├── sql/
│   └── init.sql             # Database initialization script
├── src/                     # Source code (to be created)
├── docs/                    # Documentation
└── tests/                   # Test files
```

## Next Steps

After completing Phase 1.1 (Database Setup), the next tasks are:

1. **Phase 1.2** - Core Schema Implementation
2. **Phase 1.3** - Team Registration System
3. **Phase 1.4** - Docker Code Execution Environment
4. **Phase 1.5** - Basic Frontend Framework
5. **Phase 1.6** - API Foundation

## Contributing

Please refer to the `TASK_BREAKDOWN.md` file for detailed implementation tasks.

## License

MIT License - see LICENSE file for details.