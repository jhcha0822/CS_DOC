# CS_DOC: background start BE + FE
# ROOT = CS_DOC_BASE_DIR env (set by run.bat), or folder containing this script.
# Optional: CS_DOC_FE_STATIC_DIR = relative to ROOT or absolute path (must contain index.html)

$ErrorActionPreference = "Stop"

$JarDir = $PSScriptRoot
if ($env:CS_DOC_BASE_DIR -and (Test-Path $env:CS_DOC_BASE_DIR)) {
    $Root = (Resolve-Path $env:CS_DOC_BASE_DIR).Path
} else {
    $Root = (Resolve-Path $JarDir).Path
}

$LogDir = Join-Path $Root "CS_DOC_DATA\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$LogDate = Get-Date -Format "yyyy-MM-dd"
$FeLog = Join-Path $LogDir "fe-$LogDate.log"
# Start-Process cannot redirect stdout and stderr to the same file; use two files.
$BeJvmOutLog = Join-Path $LogDir "be-jvm-$LogDate.out.log"
$BeJvmErrLog = Join-Path $LogDir "be-jvm-$LogDate.err.log"
$PidFile = Join-Path $LogDir "cs_doc.pid"

$JavaHome = Join-Path $Root "jdk17"
$JavaExe = Join-Path $JavaHome "bin\java.exe"
if (-not (Test-Path $JavaExe)) {
    Write-Error "Java 17 not found: $JavaExe"
}

$JarName = "CS_DOC-0.0.1-SNAPSHOT.jar"
if (-not (Test-Path (Join-Path $JarDir $JarName))) { $JarName = "cs_doc-0.0.1-SNAPSHOT.jar" }
$JarPath = Join-Path $JarDir $JarName
if (-not (Test-Path $JarPath)) {
    Write-Error "JAR not found: $JarPath (place next to run.bat)"
}

$env:JAVA_HOME = $JavaHome
$env:CS_DOC_BASE_DIR = $Root
if (-not $env:CS_DOC_DB_USERNAME) { $env:CS_DOC_DB_USERNAME = "CS_DOC" }
if (-not $env:CS_DOC_DB_PASSWORD) { $env:CS_DOC_DB_PASSWORD = "1csxla!@" }
if (-not $env:CS_DOC_SERVER_PORT) { $env:CS_DOC_SERVER_PORT = "8080" }

function Resolve-FeStaticDir {
    param([string]$DeployRoot)

    $trimmed = $env:CS_DOC_FE_STATIC_DIR
    if ($trimmed -and $trimmed.Trim().Length -gt 0) {
        $p = $trimmed.Trim()
        $candidate = if ([System.IO.Path]::IsPathRooted($p)) { $p } else { Join-Path $DeployRoot $p }
        if (Test-Path (Join-Path $candidate "index.html")) {
            return (Resolve-Path $candidate).Path
        }
        Write-Warning "CS_DOC_FE_STATIC_DIR has no index.html: $p ; trying auto-detect."
    }

    if (Test-Path (Join-Path $DeployRoot "index.html")) {
        return (Resolve-Path $DeployRoot).Path
    }

    foreach ($sub in @("FE_DIST", "dist", "build", "public", "FE_dist")) {
        $html = Join-Path $DeployRoot "$sub\index.html"
        if (Test-Path $html) {
            return (Resolve-Path (Join-Path $DeployRoot $sub)).Path
        }
    }

    return $null
}

$FeServeAbs = Resolve-FeStaticDir -DeployRoot $Root

if (Test-Path $PidFile) {
    Get-Content $PidFile -ErrorAction SilentlyContinue | ForEach-Object {
        $p = $_.Trim()
        if ($p -match '^\d+$') {
            Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

$beArgs = @("-jar", $JarName)

$beProc = Start-Process -FilePath $JavaExe `
    -ArgumentList $beArgs `
    -WorkingDirectory $JarDir `
    -WindowStyle Hidden `
    -PassThru `
    -RedirectStandardOutput $BeJvmOutLog `
    -RedirectStandardError $BeJvmErrLog

Start-Sleep -Seconds 3

$feProc = $null
if ($FeServeAbs) {
    $feArg = "/c npx --yes serve -s `"$FeServeAbs`" -l 5173 >> `"$FeLog`" 2>&1"
    $feProc = Start-Process -FilePath "cmd.exe" -ArgumentList $feArg -WorkingDirectory $Root -WindowStyle Hidden -PassThru
}

$pids = @($beProc.Id)
if ($feProc) { $pids += $feProc.Id }
$pids -join "`n" | Set-Content -Path $PidFile -Encoding ascii

Write-Host "[OK] ROOT=$Root"
Write-Host "     BE PID=$($beProc.Id) Logback logs: $LogDir"
Write-Host "     JVM stdout: $BeJvmOutLog"
Write-Host "     JVM stderr: $BeJvmErrLog"
if ($feProc) {
    Write-Host "     FE PID=$($feProc.Id) static=$FeServeAbs log=$FeLog"
} else {
    Write-Host "[WARN] FE not started: put index.html under ROOT or FE_DIST/dist/... or set CS_DOC_FE_STATIC_DIR"
}
Write-Host "     PID file: $PidFile"
Write-Host "Stop: stop.bat"
