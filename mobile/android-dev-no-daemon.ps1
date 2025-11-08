# PowerShell wrapper script for android:dev with --no-daemon flag
# This can help avoid file locking issues on Windows

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

# Clean Gradle cache first
Write-Host "Cleaning Gradle cache..." -ForegroundColor Yellow
cd android
.\gradlew.bat --stop 2>&1 | Out-Null
Start-Sleep -Seconds 2

# Try to delete the problematic cache folder
$cacheFolder = ".gradle\8.10.2\dependencies-accessors"
if (Test-Path $cacheFolder) {
    Remove-Item -Recurse -Force $cacheFolder -ErrorAction SilentlyContinue
}

cd ..

# Run React Native with custom Gradle flags
Write-Host "Running: npm run android:dev (with Gradle workarounds)" -ForegroundColor Cyan

# Set environment variable to pass to Gradle
$env:ORG_GRADLE_DAEMON = "false"

# Unfortunately, we can't easily pass --no-daemon to gradlew through React Native
# So we'll just try the normal build
npm run android:dev



