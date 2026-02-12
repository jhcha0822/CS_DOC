# 테스트 환경 초기화 스크립트
# memo와 post 데이터를 모두 삭제하고 재실행

$ErrorActionPreference = "Stop"

# CS_DOC_BASE_DIR 환경변수 확인 (기본값: D:\Project)
$baseDir = $env:CS_DOC_BASE_DIR
if ([string]::IsNullOrWhiteSpace($baseDir)) {
    $baseDir = "D:\Project"
    Write-Host "CS_DOC_BASE_DIR 환경변수가 설정되지 않아 기본값 사용: $baseDir" -ForegroundColor Yellow
} else {
    Write-Host "CS_DOC_BASE_DIR: $baseDir" -ForegroundColor Green
}

$dataDir = Join-Path $baseDir "CS_DOC_DATA"
$mdDir = Join-Path $dataDir "md"
$postsDir = Join-Path $mdDir "posts"
$h2Dir = Join-Path $dataDir "h2"
$uploadsDir = Join-Path $dataDir "uploads"

Write-Host "`n=== 테스트 데이터 초기화 시작 ===" -ForegroundColor Cyan

# 1. H2 데이터베이스 파일 삭제
if (Test-Path $h2Dir) {
    Write-Host "`nH2 데이터베이스 파일 삭제 중..." -ForegroundColor Yellow
    $h2Files = Get-ChildItem -Path $h2Dir -Filter "*.db" -ErrorAction SilentlyContinue
    foreach ($file in $h2Files) {
        try {
            Remove-Item -Path $file.FullName -Force -ErrorAction Stop
            Write-Host "  삭제: $($file.Name)" -ForegroundColor Green
        } catch {
            Write-Host "  삭제 실패: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    if ($h2Files.Count -eq 0) {
        Write-Host "  삭제할 H2 파일이 없습니다." -ForegroundColor Gray
    }
} else {
    Write-Host "`nH2 디렉토리가 없습니다: $h2Dir" -ForegroundColor Gray
}

# 2. posts/*.md 파일 삭제
if (Test-Path $postsDir) {
    Write-Host "`nposts/*.md 파일 삭제 중..." -ForegroundColor Yellow
    $mdFiles = Get-ChildItem -Path $postsDir -Filter "*.md" -ErrorAction SilentlyContinue
    foreach ($file in $mdFiles) {
        try {
            Remove-Item -Path $file.FullName -Force -ErrorAction Stop
            Write-Host "  삭제: $($file.Name)" -ForegroundColor Green
        } catch {
            Write-Host "  삭제 실패: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    if ($mdFiles.Count -eq 0) {
        Write-Host "  삭제할 md 파일이 없습니다." -ForegroundColor Gray
    }
} else {
    Write-Host "`nposts 디렉토리가 없습니다: $postsDir" -ForegroundColor Gray
}

# 3. memo 관련 파일 삭제 (있다면)
$memoDir = Join-Path $mdDir "memo"
if (Test-Path $memoDir) {
    Write-Host "`nmemo/*.md 파일 삭제 중..." -ForegroundColor Yellow
    $memoFiles = Get-ChildItem -Path $memoDir -Filter "*.md" -ErrorAction SilentlyContinue
    foreach ($file in $memoFiles) {
        try {
            Remove-Item -Path $file.FullName -Force -ErrorAction Stop
            Write-Host "  삭제: $($file.Name)" -ForegroundColor Green
        } catch {
            Write-Host "  삭제 실패: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    if ($memoFiles.Count -eq 0) {
        Write-Host "  삭제할 memo 파일이 없습니다." -ForegroundColor Gray
    }
}

# 4. 업로드 파일 삭제 (선택사항 - 주석 해제하면 삭제)
# if (Test-Path $uploadsDir) {
#     Write-Host "`n업로드 파일 삭제 중..." -ForegroundColor Yellow
#     Get-ChildItem -Path $uploadsDir -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
#     Write-Host "  업로드 디렉토리 정리 완료" -ForegroundColor Green
# }

Write-Host "`n=== 초기화 완료 ===" -ForegroundColor Cyan
Write-Host "`n다음 명령어로 애플리케이션을 재실행하세요:" -ForegroundColor Yellow
Write-Host "  cd BE" -ForegroundColor White
Write-Host "  .\gradlew.bat bootRun --args=`"--spring.profiles.active=test`"" -ForegroundColor White
Write-Host "`n또는 data-init 프로필로 완전 초기화:" -ForegroundColor Yellow
Write-Host "  .\gradlew.bat bootRun --args=`"--spring.profiles.active=data-init`"" -ForegroundColor White
