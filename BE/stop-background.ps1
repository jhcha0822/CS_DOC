# Stop BE + FE using PID file (same ROOT rule as run-background.ps1)
$BeDir = $PSScriptRoot
if ($env:CS_DOC_BASE_DIR -and (Test-Path $env:CS_DOC_BASE_DIR)) {
    $Root = (Resolve-Path $env:CS_DOC_BASE_DIR).Path
} else {
    $Root = (Resolve-Path (Join-Path $BeDir "..")).Path
}
$PidFile = Join-Path $Root "CS_DOC_DATA\logs\cs_doc.pid"

if (-not (Test-Path $PidFile)) {
    Write-Host "[INFO] No PID file: $PidFile"
    exit 1
}

Get-Content $PidFile | ForEach-Object {
    $p = $_.Trim()
    if ($p -match '^\d+$') {
        try {
            # kill process tree to ensure node/serve is gone
            cmd.exe /c "taskkill /PID $p /T /F" | Out-Null
            Write-Host "Stopped PID tree $p"
        } catch {
            Write-Host "PID $p : $($_.Exception.Message)"
        }
    }
}
Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
Write-Host "Done."
exit 0
