@echo off
chcp 65001 >nul
setlocal

REM ============================================
REM CS_DOC 실제 운용 실행 (BE + FE 동시 기동)
REM 이 배치 파일은 D:\jhcha0822\CS_DOC 에 두고 실행하세요.
REM JDK 17: 로컬 JDK 폴더를 서버 D:\jhcha0822\CS_DOC\jdk17 에 복사 후 사용.
REM ※ data-init 프로필 미사용 → 재기동 시 기존 데이터 유지됨.
REM ============================================

set "ROOT=D:\jhcha0822\CS_DOC"
set "JAVA_HOME=%ROOT%\jdk17"
set "CS_DOC_BASE_DIR=%ROOT%"
set "CS_DOC_DB_USERNAME=CS_DOC"
set "CS_DOC_DB_PASSWORD=1csxla!@"
set "CS_DOC_SERVER_PORT=8080"

cd /d "%~dp0"

REM Java 17 확인 (jdk17 폴더에 로컬 JDK 복사해 둔 경우)
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [오류] Java 17을 찾을 수 없습니다.
    echo        로컬 JDK 17 폴더 전체를 서버 %JAVA_HOME% 에 복사해 주세요.
    pause
    exit /b 1
)

REM JAR 파일 확인
set "JAR_NAME=CS_DOC-0.0.1-SNAPSHOT.jar"
if not exist "%JAR_NAME%" set "JAR_NAME=cs_doc-0.0.1-SNAPSHOT.jar"
if not exist "%JAR_NAME%" (
    echo [오류] JAR 파일을 찾을 수 없습니다.
    echo        이 폴더에 BE 빌드 결과 JAR을 넣어 주세요.
    pause
    exit /b 1
)

REM FE 정적 폴더 확인 (빌드된 FE 배포본)
if not exist "FE_DIST\index.html" (
    echo [안내] FE_DIST 폴더가 없거나 index.html이 없습니다.
    echo        FE 빌드 후 dist 내용을 FE_DIST 로 복사해 주세요.
    echo        BE만 시작합니다.
    echo.
    set "FE_SKIP=1"
)

REM 1) 백엔드 새 CMD 창에서 실행 (창 닫으면 BE 종료)
start "CS_DOC BE" cmd /k "set "JAVA_HOME=%JAVA_HOME%" && set "CS_DOC_BASE_DIR=%ROOT%" && set "CS_DOC_DB_USERNAME=%CS_DOC_DB_USERNAME%" && set "CS_DOC_DB_PASSWORD=%CS_DOC_DB_PASSWORD%" && set "CS_DOC_SERVER_PORT=%CS_DOC_SERVER_PORT%" && cd /d "%~dp0" && echo BE 시작 중... && "%JAVA_HOME%\bin\java.exe" -jar "%JAR_NAME%""

REM BE 기동 대기
timeout /t 3 /nobreak >nul

REM 2) 프론트엔드 새 CMD 창에서 실행 (FE_DIST 있을 때만)
if not defined FE_SKIP (
    start "CS_DOC FE" cmd /k "cd /d "%~dp0" && echo FE 시작 중... && npx --yes serve -s FE_DIST -l 5173"
    echo.
    echo [실행 중] BE: http://localhost:%CS_DOC_SERVER_PORT%  ^|  FE: http://localhost:5173
) else (
    echo [실행 중] BE: http://localhost:%CS_DOC_SERVER_PORT%
)

echo.
echo 서비스 이용: 브라우저에서 FE 주소로 접속하세요.
echo 종료: 각 CMD 창(CS_DOC BE, CS_DOC FE)을 닫으세요.
echo.
pause
