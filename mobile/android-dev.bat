@echo off
REM Batch file wrapper for android:dev that sets environment variables
REM This ensures gradlew.bat can find Java and Android tools

REM Set JAVA_HOME
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"

REM Set ANDROID_HOME
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"

REM Add Android SDK tools to PATH
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%ANDROID_HOME%\tools;%ANDROID_HOME%\tools\bin;%JAVA_HOME%\bin;%PATH%"

REM Verify Java exists
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo ERROR: Java not found at %JAVA_HOME%
    exit /b 1
)

REM Verify Android SDK exists
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    echo ERROR: Android SDK not found at %ANDROID_HOME%
    exit /b 1
)

REM Run the npm script
echo Running: npm run android:dev
call npm run android:dev



