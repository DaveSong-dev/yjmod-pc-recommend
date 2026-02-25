Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$crawlerDir = Join-Path $root "crawler"
$buildDir = Join-Path $root "build"
$logDir = Join-Path $root "logs"
$lockFile = Join-Path $logDir "auto-update.lock"
$logFile = Join-Path $logDir ("auto-update-" + (Get-Date -Format "yyyyMMdd") + ".log")
$nodeBin = "C:\Program Files\nodejs"
$npmBin = "C:\Users\pc\AppData\Roaming\npm"
$vercelCmd = Join-Path $npmBin "vercel.cmd"
$staleLockMinutes = 90
$minProductCountForDeploy = 150
$maxSoldoutNameCount = 0

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  $line | Out-File -FilePath $logFile -Encoding utf8 -Append
}

if (Test-Path $lockFile) {
  $ageMinutes = ((Get-Date) - (Get-Item $lockFile).LastWriteTime).TotalMinutes
  if ($ageMinutes -ge $staleLockMinutes) {
    Remove-Item -Path $lockFile -Force -ErrorAction SilentlyContinue
    Write-Log "stale lock removed"
  } else {
    Write-Log "already running; skip this cycle"
    exit 0
  }
}

Set-Content -Path $lockFile -Value ("started_at=" + (Get-Date -Format "o")) -Encoding ascii

try {
  $envScript = Join-Path $root ".env.local.ps1"
  if (Test-Path $envScript) {
    . $envScript
    Write-Log "env script loaded"
  }

  Set-Location $crawlerDir
  Write-Log "auto-update started"

  & python "crawl_products.py"
  if ($LASTEXITCODE -ne 0) { throw "crawl_products failed: $LASTEXITCODE" }
  Write-Log "products crawl complete"

  $productCount = 0
  $soldoutNameCount = 0
  $missingSpecCount = 0
  try {
    $checkScript = Join-Path $root "scripts\check_metrics.py"
    Set-Location $root
    $metricJson = & python $checkScript
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($metricJson)) {
      throw "python metric extraction failed (exit=$LASTEXITCODE)"
    }
    $metric = $metricJson | ConvertFrom-Json
    $productCount = [int]$metric.count
    $soldoutNameCount = [int]$metric.sold
    $missingSpecCount = [int]$metric.missing
  } catch {
    throw ("failed to read product metrics: " + $_.Exception.Message)
  }
  Write-Log ("product count after crawl: " + $productCount)
  Write-Log ("soldout-like names: " + $soldoutNameCount)
  Write-Log ("missing cpu/gpu specs: " + $missingSpecCount)
  if ($productCount -lt $minProductCountForDeploy) {
    throw ("product count too low (" + $productCount + "); deploy blocked")
  }
  if ($soldoutNameCount -gt $maxSoldoutNameCount) {
    throw ("soldout-like products detected (" + $soldoutNameCount + "); deploy blocked")
  }
  $maxMissingRatio = 0.05
  if ($productCount -gt 0 -and ($missingSpecCount / $productCount) -gt $maxMissingRatio) {
    throw ("too many products with missing cpu/gpu (" + $missingSpecCount + "/" + $productCount + "); deploy blocked")
  }

  Set-Location $crawlerDir
  & python "crawl_cafe.py"
  if ($LASTEXITCODE -ne 0) { throw "crawl_cafe failed: $LASTEXITCODE" }
  Write-Log "cafe crawl complete"

  Set-Location $root
  & python ".\scripts\export_single_html.py"
  if ($LASTEXITCODE -ne 0) { throw "export_single_html failed: $LASTEXITCODE" }
  Write-Log "single html export complete"

  if (-not (Test-Path $vercelCmd)) { throw "vercel cli missing: $vercelCmd" }
  $env:Path = "$nodeBin;$npmBin;" + $env:Path
  Set-Location $buildDir
  & $vercelCmd --prod --yes
  if ($LASTEXITCODE -ne 0) { throw "vercel deploy failed: $LASTEXITCODE" }
  Write-Log "vercel deploy complete"

  Write-Log "auto-update finished successfully"
  exit 0
}
catch {
  Write-Log ("error: " + $_.Exception.Message)
  exit 1
}
finally {
  if (Test-Path $lockFile) {
    Remove-Item -Path $lockFile -Force -ErrorAction SilentlyContinue
  }
}
