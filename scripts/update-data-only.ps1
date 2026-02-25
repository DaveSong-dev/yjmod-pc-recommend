# 재고/상품 데이터만 갱신 (크롤러만 실행, 배포 없음)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$crawlerDir = Join-Path $root "crawler"

Set-Location $crawlerDir
Write-Host "크롤러 실행 중... (완료까지 수 분 소요)" -ForegroundColor Cyan
& python "crawl_products.py"
if ($LASTEXITCODE -ne 0) {
  Write-Host "크롤러 실패: exit $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}
$dataPath = Join-Path $root "data\pc_data.json"
if (Test-Path $dataPath) {
  $count = (Get-Content $dataPath -Raw | ConvertFrom-Json).products.Count
  Write-Host "완료. data\pc_data.json 갱신됨 (제품 $count 개)" -ForegroundColor Green
} else {
  Write-Host "완료. data\pc_data.json 확인 필요." -ForegroundColor Yellow
}
