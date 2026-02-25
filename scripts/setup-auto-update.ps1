param(
  [string]$TaskName = "YJMOD-PC-Data-AutoUpdate",
  [switch]$RunNow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot "run-auto-update.ps1"
$logDir = Join-Path $root "logs"
$bootstrapDir = "C:\YJMOD-AutoUpdate"
$launcher = Join-Path $bootstrapDir "launch.ps1"
$runBat = Join-Path $bootstrapDir "run.bat"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path $bootstrapDir | Out-Null

if (-not (Test-Path $runner)) {
  throw "실행 스크립트를 찾을 수 없습니다: $runner"
}

# Python 체크
$pythonCheck = & python --version 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "python 실행 불가. Python 3 설치/환경변수(PATH) 확인 필요"
}

# 크롤러 의존성 보장
Push-Location (Join-Path $root "crawler")
try {
  & python -m pip install -r "requirements.txt"
  if ($LASTEXITCODE -ne 0) {
    throw "requirements 설치 실패"
  }
}
finally {
  Pop-Location
}

# launch.ps1: run-auto-update.ps1만 호출
$launcherContent = @"
`$ErrorActionPreference = 'Stop'
& '$runner'
exit `$LASTEXITCODE
"@
Set-Content -Path $launcher -Value $launcherContent -Encoding UTF8

# run.bat: /TR에 넣을 대상 (경로에 공백 없음 → schtasks 파싱 문제 없음)
$runBatContent = @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$launcher"
exit /b %ERRORLEVEL%
"@
Set-Content -Path $runBat -Value $runBatContent -Encoding ASCII

# 기존 작업 삭제 (없어도 무시)
$null = Start-Process -FilePath "schtasks.exe" `
  -ArgumentList @("/Delete", "/TN", $TaskName, "/F") `
  -NoNewWindow -Wait -PassThru `
  -ErrorAction SilentlyContinue

# 작업 등록: /TR은 run.bat 경로 하나만 (공백 없음)
$createProc = Start-Process -FilePath "schtasks.exe" `
  -ArgumentList @("/Create", "/TN", $TaskName, "/TR", $runBat, "/SC", "HOURLY", "/MO", "6", "/F") `
  -NoNewWindow -Wait -PassThru
if ($createProc.ExitCode -ne 0) {
  throw "작업 스케줄러 등록 실패(schtasks). 관리자 권한으로 PowerShell을 실행한 뒤 다시 시도하세요."
}

if ($RunNow) {
  $runProc = Start-Process -FilePath "schtasks.exe" `
    -ArgumentList @("/Run", "/TN", $TaskName) `
    -NoNewWindow -Wait -PassThru
  if ($runProc.ExitCode -ne 0) { Write-Host "작업 즉시 실행 실패." }
}

Write-Host ""
Write-Host "[완료] 자동 업데이트 등록 성공"
Write-Host "작업 이름: $TaskName"
Write-Host "주기: 6시간"
Write-Host "실행 스크립트: $runner"
Write-Host "런처: $launcher (실제 실행: $runBat)"
Write-Host "로그 위치: $logDir"
Write-Host ""
Write-Host "수동 실행: powershell -ExecutionPolicy Bypass -File `"$runner`""
