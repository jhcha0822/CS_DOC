# members 테이블에 name 컬럼 추가를 위한 스크립트
# H2 데이터베이스 파일 경로
$dbPath = "$env:CS_DOC_BASE_DIR\CS_DOC_DATA\h2"
if (-not $env:CS_DOC_BASE_DIR) {
    $dbPath = "D:\Project\CS_DOC_DATA\h2"
}

Write-Host "데이터베이스 파일 위치: $dbPath"

# 옵션 1: 데이터베이스 파일 백업 후 삭제 (재생성)
$backupPath = "$dbPath\backup"
if (-not (Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
}

if (Test-Path "$dbPath\csdoc.mv.db") {
    Write-Host "기존 데이터베이스 파일을 백업합니다..."
    Copy-Item "$dbPath\csdoc.mv.db" "$backupPath\csdoc.mv.db.backup.$(Get-Date -Format 'yyyyMMddHHmmss')" -Force
    Write-Host "백업 완료. 원하시면 다음 명령으로 복원할 수 있습니다:"
    Write-Host "Copy-Item `"$backupPath\csdoc.mv.db.backup.*`" `"$dbPath\csdoc.mv.db`" -Force"
    Write-Host ""
    Write-Host "데이터베이스를 재생성하려면 다음 파일들을 삭제하세요:"
    Write-Host "  - $dbPath\csdoc.mv.db"
    Write-Host "  - $dbPath\csdoc.trace.db (있는 경우)"
    Write-Host ""
    Write-Host "애플리케이션을 재시작하면 자동으로 새 스키마로 생성됩니다."
} else {
    Write-Host "데이터베이스 파일이 없습니다. 애플리케이션을 실행하면 자동으로 생성됩니다."
}
