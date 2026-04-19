@echo off
chcp 65001 >nul
setlocal

REM ============================================
REM CS_DOC BE/FE 프로세스 종료 (run.bat으로 기동한 경우)
REM run.bat 실행 시 저장된 PID로 종료. PID 파일 없으면 명령줄 기준으로 종료 시도.
REM ============================================

set "ROOT=D:\jhcha0822\CS_DOC"
set "LOG_DIR=%ROOT%\CS_DOC_DATA\logs"
set "PID_FILE=%LOG_DIR%\cs_doc.pid"

cd /d "%~dp0"

if exist "%PID_FILE%" (
    echo [종료] PID 파일에서 프로세스 종료: %PID_FILE%
    for /f "usebackq delims=" %%a in ("%PID_FILE%") do (
        taskkill /PID %%a /F >nul 2>&1
        if errorlevel 1 (
            echo   PID %%a 이미 종료됨 또는 권한 없음
        ) else (
            echo   PID %%a 종료됨
        )
    )
    del /q "%PID_FILE%" 2>nul
    echo.
    echo CS_DOC 프로세스 종료를 요청했습니다.
) else (
    echo [안내] PID 파일이 없습니다. run.bat으로 기동하지 않았거나 이미 종료된 상태일 수 있습니다.
    echo 명령줄 기준으로 BE(FE) 프로세스를 찾아 종료 시도합니다.
    echo.
    powershell -NoProfile -Command ^
      "$jar = 'CS_DOC-0.0.1-SNAPSHOT.jar'; $found = 0; Get-CimInstance Win32_Process -Filter \"name='java.exe'\" | Where-Object { $_.CommandLine -like \"*$jar*\" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $found++; Write-Host 'BE java 종료:', $_.ProcessId }; Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { $_.CommandLine -like \"*serve*5173*\" -or $_.CommandLine -like \"*FE_DIST*\" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $found++; Write-Host 'FE node 종료:', $_.ProcessId }; if ($found -eq 0) { Write-Host '종료할 CS_DOC 프로세스를 찾지 못했습니다.' }"
)

echo.
pause
