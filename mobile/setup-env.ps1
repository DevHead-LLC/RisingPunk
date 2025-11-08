# Quick environment setup for React Native Android development
# This script sets environment variables for the current PowerShell session

Write-Host "Setting up Android development environment..." -ForegroundColor Cyan

# Set JAVA_HOME to Android Studio's bundled JDK
$javaHome = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path "$javaHome\bin\java.exe") {
    $env:JAVA_HOME = $javaHome
    Write-Host "✓ JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "✗ Java not found at: $javaHome" -ForegroundColor Red
    Write-Host "  Please install Android Studio or set JAVA_HOME manually" -ForegroundColor Yellow
    exit 1
}

# Set ANDROID_HOME to default SDK location
$androidHome = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $androidHome) {
    $env:ANDROID_HOME = $androidHome
    Write-Host "✓ ANDROID_HOME set to: $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "✗ Android SDK not found at: $androidHome" -ForegroundColor Red
    Write-Host "  Please install Android Studio and SDK" -ForegroundColor Yellow
    exit 1
}

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

Write-Host "✓ PATH updated with Android SDK tools" -ForegroundColor Green
Write-Host ""

# Verify setup
Write-Host "Verifying setup..." -ForegroundColor Cyan

# Check Java
$javaVersion = & "$env:JAVA_HOME\bin\java.exe" -version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Java: $($javaVersion[0])" -ForegroundColor Green
} else {
    Write-Host "✗ Java verification failed" -ForegroundColor Red
}

# Check ADB
$adbVersion = & "$env:ANDROID_HOME\platform-tools\adb.exe" version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ ADB: $($adbVersion[0])" -ForegroundColor Green
} else {
    Write-Host "✗ ADB verification failed" -ForegroundColor Red
}

# Check emulators
$emulators = & "$env:ANDROID_HOME\emulator\emulator.exe" -list-avds 2>&1
if ($LASTEXITCODE -eq 0 -and $emulators) {
    Write-Host "✓ Emulators found:" -ForegroundColor Green
    $emulators | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
} else {
    Write-Host "⚠ No emulators found. Create one in Android Studio (Tools > Device Manager)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: These settings are for this PowerShell session only." -ForegroundColor Yellow
Write-Host "To make them permanent, set them in System Environment Variables." -ForegroundColor Yellow
Write-Host ""
Write-Host "You can now run: npm run android:dev" -ForegroundColor Cyan
Write-Host ""

