# 로컬 미리보기 서버 (ES module / fetch 사용으로 file:// 불가 → 반드시 HTTP 서버 필요)
$Port = 8000
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$url = "http://localhost:$Port"
Write-Host "Starting server at $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

# 기본 브라우저에서 열기 (선택)
Start-Process $url -ErrorAction SilentlyContinue

python -m http.server $Port
