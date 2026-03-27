Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# [1/5] enrich_game_fps.py — 의도된 동작: 각 상품 URL 상세 HTML에서 FPS 문구를 파싱해
# data/pc_data.json 의 game_fps / game_fps_highlights 를 갱신한다.
# 배포 직전에 카드·상세 간 FPS 표기를 최신 쇼핑몰 본문과 맞추기 위한 단계(로컬 JSON 덮어쓰기).
Write-Host "[1/5] Enrich game FPS"
& python ".\scripts\enrich_game_fps.py"
if ($LASTEXITCODE -ne 0) { throw "enrich_game_fps.py failed" }

Write-Host "[2/5] Build single HTML"
& python ".\scripts\export_single_html.py"
if ($LASTEXITCODE -ne 0) { throw "export_single_html.py failed" }

Write-Host "[3/5] Check Vercel CLI"
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
  throw "vercel CLI not found. Run npm i -g vercel first."
}

Write-Host "[4/5] Deploy to Vercel production"
Copy-Item (Join-Path $root "vercel.json") (Join-Path $root "build\vercel.json") -Force
Set-Location (Join-Path $root "build")
& vercel --prod
if ($LASTEXITCODE -ne 0) { throw "Vercel deploy failed" }

Set-Location $root
Start-Sleep -Seconds 8

Write-Host "[5/5] Verify live FPS"
& python ".\scripts\verify_live_fps.py"
if ($LASTEXITCODE -ne 0) { throw "verify_live_fps.py failed" }

Write-Host ""
Write-Host "Done: deployed from build/index.html."
Write-Host "CMS embed source: build/cms-embed.html"
