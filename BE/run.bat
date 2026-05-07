@echo off
setlocal
REM CS_DOC: start BE + FE in background (PowerShell). Logs: ROOT\CS_DOC_DATA\logs
REM Edit ROOT below if your deploy path differs.
REM Stop services: stop.bat
REM Optional env before run: CS_DOC_FE_STATIC_DIR (folder with index.html)

cd /d "%~dp0"

set "ROOT=D:\jhcha0822\CS_DOC"
set "JAVA_HOME=%ROOT%\jdk17"
set "CS_DOC_BASE_DIR=%ROOT%"
set "CS_DOC_DB_USERNAME=CS_DOC"
set "CS_DOC_DB_PASSWORD=1csxla!@"
set "CS_DOC_SERVER_PORT=8080"

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [ERROR] Java 17 not found: %JAVA_HOME%\bin\java.exe
    pause
    exit /b 1
)

set "JAR_NAME=CS_DOC-0.0.1-SNAPSHOT.jar"
if not exist "%JAR_NAME%" set "JAR_NAME=cs_doc-0.0.1-SNAPSHOT.jar"
if not exist "%JAR_NAME%" (
    echo [ERROR] JAR not found next to this script.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-background.ps1"
if errorlevel 1 (
    echo [ERROR] Background start failed.
    pause
    exit /b 1
)
echo.
pause
