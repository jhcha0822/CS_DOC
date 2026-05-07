@echo off
setlocal
REM CS_DOC: stop BE + FE (PID file from run.bat)

set "ROOT=D:\jhcha0822\CS_DOC"
set "LOG_DIR=%ROOT%\CS_DOC_DATA\logs"
set "PID_FILE=%LOG_DIR%\cs_doc.pid"
set "CS_DOC_BASE_DIR=%ROOT%"

cd /d "%~dp0"

if exist "%~dp0stop-background.ps1" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-background.ps1" 2>nul
    if not exist "%PID_FILE%" goto AFTER_PID
)

if exist "%PID_FILE%" (
    echo Stopping PIDs from %PID_FILE%
    for /f "usebackq delims=" %%a in ("%PID_FILE%") do (
        taskkill /PID %%a /T /F >nul 2>&1
        if errorlevel 1 (
            echo   PID %%a already ended or access denied
        ) else (
            echo   PID %%a stopped
        )
    )
    del /q "%PID_FILE%" 2>nul
    echo.
    echo Done.
    goto AFTER_PID
) else (
    echo No PID file. Trying to find java.jar / node serve...
    echo.
    powershell.exe -NoProfile -Command ^
      "$jar = 'CS_DOC-0.0.1-SNAPSHOT.jar'; $found = 0; Get-CimInstance Win32_Process -Filter \"name='java.exe'\" | Where-Object { $_.CommandLine -like \"*$jar*\" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $found++; Write-Host 'Stopped BE java PID', $_.ProcessId }; Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { $_.CommandLine -like \"*serve*5173*\" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $found++; Write-Host 'Stopped FE node PID', $_.ProcessId }; if ($found -eq 0) { Write-Host 'No matching process found.' }"
)

:AFTER_PID
echo.
pause
