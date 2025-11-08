# PowerShell wrapper script for android:dev
# This script sets environment variables and runs the React Native command

# Set JAVA_HOME to Android Studio's bundled JDK
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

# Set ANDROID_HOME to default SDK location
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

# Add Android SDK tools to PATH
$pathsToAdd = @(
    "$env:ANDROID_HOME\platform-tools",
    "$env:ANDROID_HOME\emulator",
    "$env:ANDROID_HOME\tools",
    "$env:ANDROID_HOME\tools\bin",
    "$env:JAVA_HOME\bin"
)

foreach ($path in $pathsToAdd) {
    if (Test-Path $path) {
        if ($env:PATH -notlike "*$path*") {
            $env:PATH = "$path;$env:PATH"
        }
    }
}

# Verify critical paths
if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    Write-Host "ERROR: Java not found at $env:JAVA_HOME" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) {
    Write-Host "ERROR: Android SDK not found at $env:ANDROID_HOME" -ForegroundColor Red
    exit 1
}

# Clean Gradle cache to avoid Windows file locking issues
Write-Host "Cleaning Gradle cache to avoid file locking issues..." -ForegroundColor Yellow

cd android

# Stop all Gradle daemons multiple times
Write-Host "Stopping Gradle daemons..." -ForegroundColor Yellow
for ($i = 1; $i -le 3; $i++) {
    .\gradlew.bat --stop 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}

# Kill any remaining Java processes
Write-Host "Killing remaining Java processes..." -ForegroundColor Yellow
Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Delete the ENTIRE .gradle folder - most aggressive cleanup
if (Test-Path ".gradle") {
    Write-Host "Deleting entire .gradle folder..." -ForegroundColor Yellow
    $maxAttempts = 10
    $attempt = 0
    $deleted = $false
    
    while ($attempt -lt $maxAttempts -and -not $deleted) {
        try {
            # Try to remove read-only files first
            Get-ChildItem -Path ".gradle" -Recurse -Force | ForEach-Object {
                $_.Attributes = "Normal"
            }
            Remove-Item -Path ".gradle" -Recurse -Force -ErrorAction Stop
            Write-Host "[OK] .gradle folder deleted successfully" -ForegroundColor Green
            $deleted = $true
        } catch {
            $attempt++
            if ($attempt -lt $maxAttempts) {
                Write-Host "Attempt $attempt/$maxAttempts failed, waiting..." -ForegroundColor Yellow
                # Stop daemons again
                .\gradlew.bat --stop 2>&1 | Out-Null
                Start-Sleep -Seconds 3
                # Kill Java processes again
                Get-Process -Name java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            } else {
                Write-Host "[WARNING] Could not delete .gradle folder completely" -ForegroundColor Yellow
                Write-Host "Try: 1) Close Android Studio, 2) Restart computer, 3) Run as Administrator" -ForegroundColor Yellow
            }
        }
    }
    
    if ($deleted) {
        Start-Sleep -Seconds 2
    }
}

cd ..

Write-Host "Gradle cache cleanup complete" -ForegroundColor Green

# Run the React Native command
Write-Host "Running: npm run android:dev" -ForegroundColor Cyan
npm run android:dev

