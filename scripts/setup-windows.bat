@echo off
:: CS Club Hackathon Platform - Windows Setup Script (Batch Version)
:: Simple batch script to install compilers via Chocolatey

echo.
echo ==========================================
echo CS Club Hackathon Platform - Windows Setup  
echo ==========================================
echo.

:: Check if Chocolatey is installed
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Chocolatey...
    @powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Chocolatey
        pause
        exit /b 1
    )
    echo Chocolatey installed successfully!
    echo.
    
    :: Reload environment
    call refreshenv
) else (
    echo Chocolatey is already installed
)

echo.
echo Installing development tools and compilers...
echo.

:: Install Node.js
echo Installing Node.js...
choco install nodejs -y

:: Install Git  
echo Installing Git...
choco install git -y

:: Install Python
echo Installing Python...
choco install python -y

:: Install C++ Compiler (MinGW)
echo Installing C++ compiler (MinGW)...
choco install mingw -y

:: Install Java JDK
echo Installing Java JDK...
choco install openjdk -y

echo.
echo ========================================
echo Installation completed!
echo ========================================
echo.

:: Verify installations
echo Verifying installations...
echo.

node --version 2>nul && echo ✓ Node.js installed || echo ✗ Node.js not found
npm --version 2>nul && echo ✓ npm installed || echo ✗ npm not found
git --version 2>nul && echo ✓ Git installed || echo ✗ Git not found
python --version 2>nul && echo ✓ Python installed || echo ✗ Python not found
g++ --version 2>nul && echo ✓ C++ compiler (g++) installed || echo ✗ C++ compiler not found
javac -version 2>nul && echo ✓ Java compiler (javac) installed || echo ✗ Java compiler not found

echo.
echo IMPORTANT: Close and reopen your terminal for changes to take effect
echo.
echo Next steps:
echo 1. Close this terminal
echo 2. Open a new Command Prompt or PowerShell
echo 3. Navigate to your project directory
echo 4. Run: npm install
echo 5. Run: npm start
echo.

pause