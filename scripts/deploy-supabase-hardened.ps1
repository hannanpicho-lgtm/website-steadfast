param(
  [string]$ProjectRef = "gvqwvuqeenkusdayosty",
  [string]$FunctionName = "make-server-a1c55d7e",
  [switch]$AllowDirty,
  [switch]$SkipVersionBumpCheck,
  [switch]$RunSmoke
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not available in PATH."
  }
}

function Get-FunctionState {
  param(
    [string]$Project,
    [string]$Name
  )

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $raw = & supabase functions list --project-ref $Project --output json 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference

  if ($exitCode -ne 0) {
    throw "Unable to read Supabase function state for project '$Project'."
  }

  $rawText = ($raw | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
  $jsonStart = $rawText.IndexOf('[')
  $jsonEnd = $rawText.LastIndexOf(']')
  if ($jsonStart -lt 0 -or $jsonEnd -lt $jsonStart) {
    throw "Unable to parse Supabase function list output as JSON. Raw output:`n$rawText"
  }

  $jsonText = $rawText.Substring($jsonStart, ($jsonEnd - $jsonStart + 1))
  $list = $jsonText | ConvertFrom-Json
  $item = $list | Where-Object { $_.name -eq $Name } | Select-Object -First 1
  if (-not $item) {
    throw "Function '$Name' not found in project '$Project'."
  }

  $updatedAtUtc = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$item.updated_at).UtcDateTime
  return [PSCustomObject]@{
    Name = [string]$item.name
    Version = [int]$item.version
    Status = [string]$item.status
    UpdatedAtUtc = $updatedAtUtc
    UpdatedAtRaw = [int64]$item.updated_at
  }
}

function Ensure-GitGuards {
  param([bool]$AllowDirtyTree)

  $branch = (git branch --show-current).Trim()
  $headSha = (git rev-parse --short HEAD).Trim()
  $headShaLong = (git rev-parse HEAD).Trim()
  $statusOutput = git status --porcelain
  $status = (($statusOutput | Out-String).Trim())

  if (-not $AllowDirtyTree -and $status) {
    throw "Working tree is not clean. Commit or stash changes, or use -AllowDirty explicitly."
  }

  $originMain = ""
  try {
    $originMain = (git rev-parse origin/main).Trim()
  }
  catch {
    $originMain = ""
  }

  if ($branch -eq "main" -and $originMain -and $headShaLong -ne $originMain) {
    throw "Local main is not aligned with origin/main. Pull/rebase first to avoid deploying stale code."
  }

  return [PSCustomObject]@{
    Branch = $branch
    HeadShort = $headSha
    HeadLong = $headShaLong
    OriginMain = $originMain
    IsDirty = [bool]$status
  }
}

Require-Command -Name "supabase"
Require-Command -Name "git"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot

try {
  $gitState = Ensure-GitGuards -AllowDirtyTree:$AllowDirty.IsPresent
  $before = Get-FunctionState -Project $ProjectRef -Name $FunctionName

  Write-Host "[HARDENED-DEPLOY] Project: $ProjectRef"
  Write-Host "[HARDENED-DEPLOY] Function: $FunctionName"
  Write-Host "[HARDENED-DEPLOY] Git: $($gitState.Branch) @ $($gitState.HeadShort)"
  Write-Host "[HARDENED-DEPLOY] Before: version=$($before.Version) updated=$($before.UpdatedAtUtc.ToString('u'))"

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $deployOutput = & supabase functions deploy $FunctionName --project-ref $ProjectRef 2>&1
  $deployExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference

  if ($deployExitCode -ne 0) {
    $joined = ($deployOutput | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
    throw "Supabase deploy failed.`n$joined"
  }

  Start-Sleep -Seconds 2
  $after = Get-FunctionState -Project $ProjectRef -Name $FunctionName

  if (-not $SkipVersionBumpCheck.IsPresent -and $after.Version -le $before.Version) {
    throw "Deployment verification failed: version did not increase (before=$($before.Version), after=$($after.Version))."
  }

  if ($after.UpdatedAtRaw -lt $before.UpdatedAtRaw) {
    throw "Deployment verification failed: updated_at moved backwards."
  }

  $smokeRan = $false
  $smokeExitCode = $null
  if ($RunSmoke.IsPresent) {
    $smokeRan = $true
    & node scripts/api-smoke-test.mjs
    $smokeExitCode = $LASTEXITCODE
    if ($smokeExitCode -ne 0) {
      throw "Post-deploy smoke test failed with exit code $smokeExitCode."
    }
  }

  $reportsDir = Join-Path $repoRoot "deployment_reports/supabase"
  New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

  $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $reportPath = Join-Path $reportsDir "deploy_${FunctionName}_$timestamp.json"

  $report = [ordered]@{
    timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
    projectRef = $ProjectRef
    functionName = $FunctionName
    git = [ordered]@{
      branch = $gitState.Branch
      headShort = $gitState.HeadShort
      headLong = $gitState.HeadLong
      originMain = $gitState.OriginMain
      isDirty = $gitState.IsDirty
    }
    before = [ordered]@{
      version = $before.Version
      status = $before.Status
      updatedAtUtc = $before.UpdatedAtUtc.ToString("o")
      updatedAtRaw = $before.UpdatedAtRaw
    }
    after = [ordered]@{
      version = $after.Version
      status = $after.Status
      updatedAtUtc = $after.UpdatedAtUtc.ToString("o")
      updatedAtRaw = $after.UpdatedAtRaw
    }
    smoke = [ordered]@{
      ran = $smokeRan
      exitCode = $smokeExitCode
    }
    deployOutput = ($deployOutput | ForEach-Object { $_.ToString() })
  }

  ($report | ConvertTo-Json -Depth 10) | Out-File -FilePath $reportPath -Encoding utf8

  Write-Host "[HARDENED-DEPLOY] After: version=$($after.Version) updated=$($after.UpdatedAtUtc.ToString('u'))"
  Write-Host "[HARDENED-DEPLOY] Report: $reportPath"
  Write-Host "[HARDENED-DEPLOY] Deployment verification passed."
}
finally {
  Pop-Location
}
