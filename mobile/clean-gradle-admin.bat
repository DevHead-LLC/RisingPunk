@echo off
REM Run this as Administrator to clean Gradle cache
REM Right-click and select "Run as administrator"

echo Cleaning Gradle cache...

cd /d "%~dp0android"

REM Stop all Gradle daemons
call gradlew.bat --stop 2>nul
timeout /t 2 /nobreak >nul

REM Delete the entire .gradle folder
if exist .gradle (
    echo Deleting .gradle folder...
    rmdir /s /q .gradle
    echo .gradle folder deleted
)

REM Delete build folders
if exist app\build (
    echo Deleting app\build folder...
    rmdir /s /q app\build
)

echo.
echo Gradle cache cleaned! You can now try building again.
echo.
pause



