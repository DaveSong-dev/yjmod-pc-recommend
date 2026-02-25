Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "[1/3] 단일 HTML 생성"
& python ".\scripts\export_single_html.py"
if ($LASTEXITCODE -ne 0) { throw "export_single_html.py 실행 실패" }

Write-Host "[2/3] Vercel CLI 확인"
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
  throw "vercel CLI가 없습니다. 먼저 npm i -g vercel 실행 후 다시 시도하세요."
}

Write-Host "[3/3] Vercel 프로덕션 배포"
Copy-Item (Join-Path $root "vercel.json") (Join-Path $root "build\vercel.json") -Force
Set-Location (Join-Path $root "build")
& vercel --prod
if ($LASTEXITCODE -ne 0) { throw "Vercel 배포 실패" }

Write-Host ""
Write-Host "완료: build/index.html 기준으로 배포되었습니다."
Write-Host "CMS에는 build/cms-embed.html 내용을 붙여넣으세요."
