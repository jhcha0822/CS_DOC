@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules" (
    echo npm 패키지 설치 중...
    call npm install
    echo.
)

echo FE 개발 서버 시작 (http://localhost:5173)
echo 백엔드는 http://localhost:8080 에서 실행 중이어야 합니다.
echo.
call npm run dev
pause
