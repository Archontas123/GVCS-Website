# Windows Development Environment Setup Script
# CS Club Hackathon Platform - Windows Setup with Chocolatey

param(
    [switch]$SkipCompilers,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
CS Club Hackathon Platform - Windows Setup Script

This script sets up the development environment for Windows using Chocolatey.

USAGE:
    .\setup-windows.ps1                 # Full setup including compilers
    .\setup-windows.ps1 -SkipCompilers  # Skip compiler installation

WHAT THIS SCRIPT DOES:
    1. Checks if Chocolatey is installed (installs if missing)
    2. Installs Node.js and npm
    3. Installs programming language compilers (C++, Java)
    4. Installs Git (if not present)
    5. Installs Python (if not present)
    6. Verifies all installations

REQUIREMENTS:
    - Windows 10/11
    - PowerShell (Run as Administrator for best results)
    - Internet connection

PROGRAMMING LANGUAGES SUPPORTED:
    - Python 3.x (interpreter)
    - C++ (via MinGW GCC compiler)
    - Java (via OpenJDK with javac compiler)
"@
    exit 0
}

Write-Host "🚀 CS Club Hackathon Platform - Windows Setup" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator. Some installations may fail." -ForegroundColor Yellow
    Write-Host "   Consider running PowerShell as Administrator for best results." -ForegroundColor Yellow
    Write-Host ""
}

# Function to check if a command exists
function Test-CommandExists {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Function to install Chocolatey
function Install-Chocolatey {
    Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Cyan
    
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Host "✅ Chocolatey installed successfully!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Failed to install Chocolatey: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to install a package with Chocolatey
function Install-ChocoPackage {
    param($PackageName, $Description)
    
    Write-Host "📥 Installing $Description..." -ForegroundColor Cyan
    
    try {
        choco install $PackageName -y --no-progress
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Description installed successfully!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Failed to install $Description" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error installing $Description: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Step 1: Check and install Chocolatey
Write-Host "🔍 Checking for Chocolatey..." -ForegroundColor Cyan
if (-not (Test-CommandExists "choco")) {
    if (-not (Install-Chocolatey)) {
        Write-Host "❌ Setup failed: Could not install Chocolatey" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Chocolatey is already installed" -ForegroundColor Green
}

Write-Host ""

# Step 2: Update Chocolatey
Write-Host "🔄 Updating Chocolatey..." -ForegroundColor Cyan
choco upgrade chocolatey -y --no-progress

Write-Host ""

# Step 3: Install Node.js
Write-Host "🔍 Checking for Node.js..." -ForegroundColor Cyan
if (-not (Test-CommandExists "node")) {
    Install-ChocoPackage "nodejs" "Node.js and npm"
} else {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is already installed: $nodeVersion" -ForegroundColor Green
}

# Step 4: Install Git
Write-Host "🔍 Checking for Git..." -ForegroundColor Cyan
if (-not (Test-CommandExists "git")) {
    Install-ChocoPackage "git" "Git version control"
} else {
    $gitVersion = git --version
    Write-Host "✅ Git is already installed: $gitVersion" -ForegroundColor Green
}

# Step 5: Install Python
Write-Host "🔍 Checking for Python..." -ForegroundColor Cyan
if (-not (Test-CommandExists "python")) {
    Install-ChocoPackage "python" "Python interpreter"
} else {
    $pythonVersion = python --version
    Write-Host "✅ Python is already installed: $pythonVersion" -ForegroundColor Green
}

Write-Host ""

# Step 6: Install Programming Language Compilers
if (-not $SkipCompilers) {
    Write-Host "🛠️  Installing Programming Language Compilers" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    
    # Install MinGW (C++ Compiler)
    Write-Host "🔍 Checking for C++ compiler (g++)..." -ForegroundColor Cyan
    if (-not (Test-CommandExists "g++")) {
        Write-Host "📥 Installing MinGW (C++ compiler via GCC)..." -ForegroundColor Cyan
        $mingwSuccess = Install-ChocoPackage "mingw" "MinGW C++ Compiler (GCC)"
        
        if ($mingwSuccess) {
            Write-Host "📝 MinGW installed. Adding to PATH..." -ForegroundColor Cyan
            $mingwPath = "C:\tools\mingw64\bin"
            if (Test-Path $mingwPath) {
                $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
                if ($currentPath -notlike "*$mingwPath*") {
                    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$mingwPath", "User")
                    $env:Path += ";$mingwPath"
                    Write-Host "✅ MinGW path added to environment" -ForegroundColor Green
                }
            }
        }
    } else {
        $gccVersion = g++ --version | Select-Object -First 1
        Write-Host "✅ C++ compiler is already installed: $gccVersion" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # Install Java JDK (includes javac)
    Write-Host "🔍 Checking for Java compiler (javac)..." -ForegroundColor Cyan
    if (-not (Test-CommandExists "javac")) {
        Write-Host "📥 Installing OpenJDK (Java compiler)..." -ForegroundColor Cyan
        $jdkSuccess = Install-ChocoPackage "openjdk" "OpenJDK (Java Development Kit)"
        
        if ($jdkSuccess) {
            Write-Host "📝 OpenJDK installed. Refreshing environment..." -ForegroundColor Cyan
            # Refresh environment variables
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        }
    } else {
        $javacVersion = javac -version 2>&1
        Write-Host "✅ Java compiler is already installed: $javacVersion" -ForegroundColor Green
    }
} else {
    Write-Host "⏭️  Skipping compiler installation (use -SkipCompilers was specified)" -ForegroundColor Yellow
}

Write-Host ""

# Step 7: Refresh environment and verify installations
Write-Host "🔍 Verifying Installation" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

$verificationResults = @()

# Check Node.js
if (Test-CommandExists "node") {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
    $verificationResults += @{Tool="Node.js"; Status="✅"; Version=$nodeVersion}
    $verificationResults += @{Tool="npm"; Status="✅"; Version=$npmVersion}
} else {
    Write-Host "❌ Node.js: Not found" -ForegroundColor Red
    $verificationResults += @{Tool="Node.js"; Status="❌"; Version="Not found"}
}

# Check Git
if (Test-CommandExists "git") {
    $gitVersion = git --version
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
    $verificationResults += @{Tool="Git"; Status="✅"; Version=$gitVersion}
} else {
    Write-Host "❌ Git: Not found" -ForegroundColor Red
    $verificationResults += @{Tool="Git"; Status="❌"; Version="Not found"}
}

# Check Python
if (Test-CommandExists "python") {
    $pythonVersion = python --version
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
    $verificationResults += @{Tool="Python"; Status="✅"; Version=$pythonVersion}
} else {
    Write-Host "❌ Python: Not found" -ForegroundColor Red
    $verificationResults += @{Tool="Python"; Status="❌"; Version="Not found"}
}

if (-not $SkipCompilers) {
    # Check C++ Compiler
    if (Test-CommandExists "g++") {
        $gccVersion = g++ --version | Select-Object -First 1
        Write-Host "✅ C++ Compiler (g++): $gccVersion" -ForegroundColor Green
        $verificationResults += @{Tool="C++ (g++)"; Status="✅"; Version=$gccVersion}
    } else {
        Write-Host "❌ C++ Compiler (g++): Not found" -ForegroundColor Red
        $verificationResults += @{Tool="C++ (g++)"; Status="❌"; Version="Not found"}
    }
    
    # Check Java Compiler
    if (Test-CommandExists "javac") {
        $javacVersion = javac -version 2>&1
        Write-Host "✅ Java Compiler (javac): $javacVersion" -ForegroundColor Green
        $verificationResults += @{Tool="Java (javac)"; Status="✅"; Version=$javacVersion}
    } else {
        Write-Host "❌ Java Compiler (javac): Not found" -ForegroundColor Red
        $verificationResults += @{Tool="Java (javac)"; Status="❌"; Version="Not found"}
    }
}

Write-Host ""

# Step 8: Summary and next steps
$successCount = ($verificationResults | Where-Object { $_.Status -eq "✅" }).Count
$totalCount = $verificationResults.Count

Write-Host "📊 Installation Summary" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host "Successfully installed: $successCount/$totalCount tools" -ForegroundColor Cyan
Write-Host ""

if ($successCount -eq $totalCount) {
    Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Close and reopen your terminal/PowerShell"
    Write-Host "2. Navigate to your project directory"
    Write-Host "3. Run: npm install"
    Write-Host "4. Run: npm start"
    Write-Host ""
    Write-Host "🔗 Programming Language Support:" -ForegroundColor Cyan
    if (-not $SkipCompilers) {
        Write-Host "   ✅ Python - Real execution ready"
        Write-Host "   ✅ C++ - Real compilation and execution ready"
        Write-Host "   ✅ Java - Real compilation and execution ready"
    } else {
        Write-Host "   ✅ Python - Real execution ready"
        Write-Host "   ⚠️  C++ - Install MinGW for compilation"
        Write-Host "   ⚠️  Java - Install JDK for compilation"
    }
} else {
    Write-Host "⚠️  Setup completed with some issues" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "❌ Failed installations:" -ForegroundColor Red
    $verificationResults | Where-Object { $_.Status -eq "❌" } | ForEach-Object {
        Write-Host "   - $($_.Tool)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Cyan
    Write-Host "1. Try running PowerShell as Administrator"
    Write-Host "2. Check your internet connection"
    Write-Host "3. Restart your computer and try again"
    Write-Host "4. Manually install failed components"
}

Write-Host ""
Write-Host "📚 Additional Resources:" -ForegroundColor Cyan
Write-Host "   - Chocolatey: https://chocolatey.org/"
Write-Host "   - Node.js: https://nodejs.org/"
Write-Host "   - MinGW: https://www.mingw-w64.org/"
Write-Host "   - OpenJDK: https://openjdk.java.net/"

exit 0