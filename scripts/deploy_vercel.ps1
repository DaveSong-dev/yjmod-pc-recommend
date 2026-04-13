Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$prodUrl = "https://ai.youngjaecomputer.com/"
$scope = if ($env:YJMOD_VERCEL_SCOPE) { $env:YJMOD_VERCEL_SCOPE } else { "davesong-devs-projects" }

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host $Label -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed"
  }
}

Set-Location $root

Invoke-Step "[1/4] Build frontend + offline artifacts" {
  npm run build
}

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  throw "vercel CLI not found. Run npm i -g vercel first."
}

Invoke-Step "[2/4] Deploy root project to Vercel production" {
  # VERCEL_NO_UPDATE=1 suppresses the "upgrade CLI?" interactive prompt
  $env:VERCEL_NO_UPDATE = "1"
  vercel --prod --yes --scope $scope
  $env:VERCEL_NO_UPDATE = ""
}

Start-Sleep -Seconds 8

$env:YJMOD_QA_URL = $prodUrl
Invoke-Step "[3/4] Verify production wizard flow" {
  npm run qa:wizard-scroll
}
Invoke-Step "[4/4] Verify production conversion flow" {
  npm run qa:conversion
}

Write-Host ""
Write-Host "Done: production deploy verified at $prodUrl" -ForegroundColor Green
