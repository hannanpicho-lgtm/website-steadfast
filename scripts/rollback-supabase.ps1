param(
  [string]$ProjectRef = "",
  [string]$FunctionName = "make-server-a1c55d7e",
  [string]$CommitSha = "",
  [switch]$DryRun,
  [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not available in PATH."
  }
}

function Resolve-FrontendProjectRef {
  $infoPath = Join-Path (Join-Path $PSScriptRoot "..") "utils/supabase/info.tsx"
  if (-not (Test-Path $infoPath)) {
    throw "Unable to resolve frontend project ref: missing $infoPath"
  }

  $infoSource = Get-Content $infoPath -Raw
  $match = [regex]::Match($infoSource, 'projectId\s*=\s*"([a-z0-9-]+)"')
  if (-not $match.Success) {
    throw "Unable to resolve frontend project ref from $infoPath"
  }

  return $match.Groups[1].Value
}

Require-Command -Name "supabase"
Require-Command -Name "git"
Require-Command -Name "node"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  $ProjectRef = Resolve-FrontendProjectRef
}

try {
  $lkgPath = Join-Path $repoRoot "deployment_reports/supabase/last-known-good.json"

  # Resolve rollback target
  if ($CommitSha -eq "") {
    if (-not (Test-Path $lkgPath)) {
      throw "No last-known-good.json found at '$lkgPath'. Provide an explicit -CommitSha to roll back to."
    }
    $lkg = Get-Content $lkgPath -Raw | ConvertFrom-Json
    $CommitSha = $lkg.commitSha
    $targetInfo = "last-known-good (function v$($lkg.functionVersion), deployed $($lkg.timestampUtc))"
  }
  else {
    $targetInfo = "explicit commit $CommitSha"
  }

  Write-Host "[ROLLBACK] Target: $targetInfo"
  Write-Host "[ROLLBACK] Commit : $CommitSha"
  Write-Host "[ROLLBACK] Function: $FunctionName @ $ProjectRef"

  if ($DryRun.IsPresent) {
    Write-Host "[ROLLBACK] --DryRun specified. No changes made."
    exit 0
  }

  # Safety: check working tree
  if (-not $AllowDirty.IsPresent) {
    $status = (git status --porcelain | Out-String).Trim()
    if ($status) {
      throw "Working tree has uncommitted changes. Stash or commit first, or use -AllowDirty."
    }
  }

  $currentHead = (git rev-parse HEAD).Trim()
  Write-Host "[ROLLBACK] Current HEAD: $currentHead"

  if ($currentHead -eq $CommitSha) {
    Write-Host "[ROLLBACK] Already at rollback target commit. Re-deploying current HEAD."
  }
  else {
    Write-Host "[ROLLBACK] Checking out rollback target..."
    git checkout $CommitSha
    if ($LASTEXITCODE -ne 0) { throw "git checkout $CommitSha failed." }
  }

  try {
    Write-Host "[ROLLBACK] Deploying rollback target to $FunctionName..."
    # Deploy using hardened script (but skip post-deploy validation to keep rollback fast)
    & powershell -ExecutionPolicy Bypass -File "$repoRoot\scripts\deploy-supabase-hardened.ps1" `
      -ProjectRef $ProjectRef `
      -FunctionName $FunctionName `
      -ExpectedProductionFunction $FunctionName `
      -AllowDirty `
      -SkipVersionBumpCheck `
      -SkipPostDeployValidation

    if ($LASTEXITCODE -ne 0) {
      throw "Rollback deploy failed with exit code $LASTEXITCODE."
    }

    $apiBaseUrl = "https://$ProjectRef.supabase.co/functions/v1/$FunctionName"
    Write-Host "[ROLLBACK] Verifying live version and route health..."
    & node scripts/verify-live-version.mjs --base $apiBaseUrl --expected-function $FunctionName --verify-route-health true --fail-on-stale false
    if ($LASTEXITCODE -ne 0) {
      throw "Post-rollback live verification failed with exit code $LASTEXITCODE."
    }

    $reportsDir = Join-Path $repoRoot "deployment_reports/supabase"
    New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null
    $rollbackTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $rollbackReportPath = Join-Path $reportsDir "rollback_${FunctionName}_$rollbackTimestamp.json"
    $rollbackReport = [ordered]@{
      timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
      projectRef = $ProjectRef
      functionName = $FunctionName
      targetCommitSha = $CommitSha
      sourceHeadBeforeRollback = $currentHead
      verification = [ordered]@{
        command = "node scripts/verify-live-version.mjs --base $apiBaseUrl --expected-function $FunctionName --verify-route-health true --fail-on-stale false"
        success = $true
      }
    }
    ($rollbackReport | ConvertTo-Json -Depth 6) | Out-File -FilePath $rollbackReportPath -Encoding utf8
    Write-Host "[ROLLBACK] Report: $rollbackReportPath"

    Write-Host "[ROLLBACK] Rollback deploy succeeded."
  }
  finally {
    if ($currentHead -ne $CommitSha) {
      Write-Host "[ROLLBACK] Returning to original HEAD ($currentHead)..."
      git checkout $currentHead 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) {
        Write-Host "[ROLLBACK] WARNING: Could not return to original HEAD '$currentHead'. Run 'git checkout $currentHead' manually." -ForegroundColor Yellow
      }
    }
  }

  Write-Host "[ROLLBACK] Complete. Function '$FunctionName' rolled back to commit $CommitSha."
}
finally {
  Pop-Location
}
