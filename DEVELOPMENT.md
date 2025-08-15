# CS Club Website - Development Guide

## Quick Start

### Option 1: Using the start script (Recommended)

**Windows (PowerShell/Command Prompt):**
```cmd
# Start both servers
npm start
# or
start.bat

# Stop both servers
npm run stop
# or
stop.bat
```

**Linux/Mac/WSL:**
```bash
# Start both servers
npm run start:unix
# or
./start.sh

# Stop both servers
npm run stop:unix
# or
./stop.sh
```

### Option 2: Using npm scripts
```bash
# Start both servers with concurrently
npm run start:npm

# Start individual servers
npm run start:backend    # Backend on port 3000
npm run start:frontend   # Frontend on port 3001
```

### Option 3: Manual startup
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm start
```

## Server Information

- **Backend**: http://localhost:3000
  - API endpoints: `/api/*`
  - Health check: `/api/health`

- **Frontend**: http://localhost:3001
  - React development server
  - Auto-reloads on code changes

## Logs

When using the start script, logs are saved to:
- `logs/backend.log`
- `logs/frontend.log`

## Troubleshooting

### Port Already in Use
The start script automatically kills any processes using ports 3000 and 3001.

### Memory Issues
The start script sets optimized memory settings:
- `NODE_OPTIONS="--max-old-space-size=8192"`
- `GENERATE_SOURCEMAP=false`

### Database Issues
If database connection fails:
```bash
cd backend
npm run db:migrate
npm run db:seed
```

### Clean Restart
```bash
npm run stop
npm run clean
npm run install:all
npm start
```