# Comprehensive Gradle cache cleanup script
# Run this before building if you encounter file locking issues

Write-Host "=== Gradle Cache Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Android Studio is running
$androidStudio = Get-Process -Name "studio64" -ErrorAction SilentlyContinue
if ($androidStudio) {
    Write-Host "WARNING: Android Studio is running. Please close it first!" -ForegroundColor Red
    Write-Host "Press any key to continue anyway, or Ctrl+C to cancel..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

cd android

Write-Host "1. Stopping all Gradle daemons..." -ForegroundColor Yellow
.\gradlew.bat --stop 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "2. Killing any remaining Java/Gradle processes..." -ForegroundColor Yellow
Get-Process -Name java -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like "*gradle*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "3. Deleting .gradle cache folder..." -ForegroundColor Yellow
if (Test-Path ".gradle") {
    try {
        Remove-Item -Path ".gradle" -Recurse -Force -ErrorAction Stop
        Write-Host "   [OK] .gradle folder deleted" -ForegroundColor Green
    } catch {
        Write-Host "   [ERROR] Could not delete .gradle folder: $_" -ForegroundColor Red
        Write-Host "   Try running this script as Administrator" -ForegroundColor Yellow
        cd ..
        exit 1
    }
} else {
    Write-Host "   [OK] .gradle folder doesn't exist" -ForegroundColor Green
}

Write-Host "4. Deleting build folders..." -ForegroundColor Yellow
if (Test-Path "app\build") {
    Remove-Item -Path "app\build" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   [OK] app\build deleted" -ForegroundColor Green
}

cd ..

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host "You can now run: npm run android:dev:setup" -ForegroundColor Cyan
Write-Host ""
