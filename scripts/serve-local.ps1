Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$url = "http://127.0.0.1:4173/index.html"
Write-Host "Starting local HTTP server at $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Start-Process $url -ErrorAction SilentlyContinue

& npm run dev
