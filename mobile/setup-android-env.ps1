# Android Development Environment Setup Script for Windows
# This script helps diagnose and guide setup for React Native Android development

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Android Environment Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Java Installation
Write-Host "1. Checking Java Installation..." -ForegroundColor Yellow
$javaPath = (Get-Command java -ErrorAction SilentlyContinue)
if ($javaPath) {
    Write-Host "   ✓ Java found at: $($javaPath.Source)" -ForegroundColor Green
    java -version
} else {
    Write-Host "   ✗ Java not found in PATH" -ForegroundColor Red
    Write-Host "   → Install JDK 17 (LTS) from: https://adoptium.net/" -ForegroundColor Yellow
    Write-Host "   → Or use Android Studio's bundled JDK" -ForegroundColor Yellow
}

Write-Host ""

# Check JAVA_HOME
Write-Host "2. Checking JAVA_HOME..." -ForegroundColor Yellow
if ($env:JAVA_HOME) {
    Write-Host "   ✓ JAVA_HOME is set to: $env:JAVA_HOME" -ForegroundColor Green
    if (Test-Path "$env:JAVA_HOME\bin\java.exe") {
        Write-Host "   ✓ Java executable found in JAVA_HOME" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Java executable not found in JAVA_HOME path" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ JAVA_HOME is not set" -ForegroundColor Red
    Write-Host "   → Set JAVA_HOME to your JDK installation directory" -ForegroundColor Yellow
    Write-Host "   → Example: C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot" -ForegroundColor Yellow
    Write-Host "   → Or: C:\Program Files\Android\Android Studio\jbr" -ForegroundColor Yellow
}

Write-Host ""

# Check Android SDK
Write-Host "3. Checking Android SDK..." -ForegroundColor Yellow
$androidHome = $env:ANDROID_HOME
$localAppData = $env:LOCALAPPDATA
$programFiles = $env:ProgramFiles

# Common Android SDK locations
$possibleSdkPaths = @(
    $androidHome,
    "$localAppData\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "$programFiles\Android\Sdk"
)

$sdkFound = $false
foreach ($path in $possibleSdkPaths) {
    if ($path -and (Test-Path $path)) {
        Write-Host "   ✓ Android SDK found at: $path" -ForegroundColor Green
        $sdkFound = $true
        if (-not $env:ANDROID_HOME) {
            Write-Host "   ⚠ ANDROID_HOME not set, but SDK found at: $path" -ForegroundColor Yellow
            Write-Host "   → Set ANDROID_HOME=$path" -ForegroundColor Yellow
        }
        break
    }
}

if (-not $sdkFound) {
    Write-Host "   ✗ Android SDK not found" -ForegroundColor Red
    Write-Host "   → Install Android Studio from: https://developer.android.com/studio" -ForegroundColor Yellow
    Write-Host "   → During installation, note the SDK location (usually: $localAppData\Android\Sdk)" -ForegroundColor Yellow
}

Write-Host ""

# Check ADB
Write-Host "4. Checking ADB (Android Debug Bridge)..." -ForegroundColor Yellow
$adbPath = (Get-Command adb -ErrorAction SilentlyContinue)
if ($adbPath) {
    Write-Host "   ✓ ADB found at: $($adbPath.Source)" -ForegroundColor Green
    adb version
} else {
    Write-Host "   ✗ ADB not found in PATH" -ForegroundColor Red
    if ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) {
        Write-Host "   → ADB exists at: $env:ANDROID_HOME\platform-tools\adb.exe" -ForegroundColor Yellow
        Write-Host "   → Add to PATH: $env:ANDROID_HOME\platform-tools" -ForegroundColor Yellow
    } elseif ($sdkFound) {
        foreach ($path in $possibleSdkPaths) {
            if ($path -and (Test-Path "$path\platform-tools\adb.exe")) {
                Write-Host "   → ADB exists at: $path\platform-tools\adb.exe" -ForegroundColor Yellow
                Write-Host "   → Add to PATH: $path\platform-tools" -ForegroundColor Yellow
                break
            }
        }
    } else {
        Write-Host "   → Install Android SDK to get ADB" -ForegroundColor Yellow
    }
}

Write-Host ""

# Check Android Emulators
Write-Host "5. Checking Android Emulators..." -ForegroundColor Yellow
$emulatorPath = (Get-Command emulator -ErrorAction SilentlyContinue)
if ($emulatorPath) {
    Write-Host "   ✓ Emulator command found at: $($emulatorPath.Source)" -ForegroundColor Green
    $avds = & emulator -list-avds 2>&1
    if ($LASTEXITCODE -eq 0 -and $avds) {
        Write-Host "   ✓ Available emulators:" -ForegroundColor Green
        $avds | ForEach-Object { Write-Host "     - $_" -ForegroundColor Cyan }
    } else {
        Write-Host "   ✗ No emulators found" -ForegroundColor Red
        Write-Host "   → Create an emulator using Android Studio:" -ForegroundColor Yellow
        Write-Host "     1. Open Android Studio" -ForegroundColor Yellow
        Write-Host "     2. Tools > Device Manager" -ForegroundColor Yellow
        Write-Host "     3. Create Device > Select a device > Download system image > Finish" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ Emulator command not found" -ForegroundColor Red
    if ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\emulator\emulator.exe")) {
        Write-Host "   → Emulator exists at: $env:ANDROID_HOME\emulator\emulator.exe" -ForegroundColor Yellow
        Write-Host "   → Add to PATH: $env:ANDROID_HOME\emulator" -ForegroundColor Yellow
    }
}

Write-Host ""

# Summary and Recommendations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SETUP RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "To fix these issues, you need to set environment variables:" -ForegroundColor White
Write-Host ""
Write-Host "Option 1: Set for current PowerShell session (temporary):" -ForegroundColor Yellow
Write-Host '  $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"' -ForegroundColor Gray
Write-Host '  $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"' -ForegroundColor Gray
Write-Host '  $env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:ANDROID_HOME\tools;$env:ANDROID_HOME\tools\bin;$env:JAVA_HOME\bin;$env:PATH"' -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Set permanently via System Properties:" -ForegroundColor Yellow
Write-Host "  1. Right-click 'This PC' > Properties > Advanced system settings" -ForegroundColor White
Write-Host "  2. Click 'Environment Variables'" -ForegroundColor White
Write-Host "  3. Under 'User variables', click 'New' and add:" -ForegroundColor White
Write-Host "     - JAVA_HOME: Path to your JDK installation" -ForegroundColor White
Write-Host "     - ANDROID_HOME: Path to your Android SDK (usually %LOCALAPPDATA%\Android\Sdk)" -ForegroundColor White
Write-Host "  4. Edit PATH variable and add:" -ForegroundColor White
Write-Host "     - %ANDROID_HOME%\platform-tools" -ForegroundColor White
Write-Host "     - %ANDROID_HOME%\emulator" -ForegroundColor White
Write-Host "     - %ANDROID_HOME%\tools" -ForegroundColor White
Write-Host "     - %ANDROID_HOME%\tools\bin" -ForegroundColor White
Write-Host "     - %JAVA_HOME%\bin" -ForegroundColor White
Write-Host ""
Write-Host "After setting environment variables, restart your terminal and run this script again." -ForegroundColor Cyan
Write-Host ""

# Quick fix script generator
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QUICK FIX SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "I can generate a quick-fix script. Common paths:" -ForegroundColor White
Write-Host ""

$quickFixScript = @"
# Quick fix for Android environment (run in PowerShell as Administrator)
# Update the paths below to match your installation

`$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot"  # Update this path
`$env:ANDROID_HOME = "`$env:LOCALAPPDATA\Android\Sdk"
`$env:PATH = "`$env:ANDROID_HOME\platform-tools;`$env:ANDROID_HOME\emulator;`$env:ANDROID_HOME\tools;`$env:ANDROID_HOME\tools\bin;`$env:JAVA_HOME\bin;`$env:PATH"

# Verify
Write-Host "JAVA_HOME: `$env:JAVA_HOME"
Write-Host "ANDROID_HOME: `$env:ANDROID_HOME"
java -version
adb version
"@

Write-Host $quickFixScript -ForegroundColor Gray

