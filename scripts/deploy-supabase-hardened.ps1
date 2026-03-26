param(
  [string]$ProjectRef = "gvqwvuqeenkusdayosty",
  [string]$FunctionName = "make-server-a1c55d7e",
  [string]$ExpectedProductionFunction = "make-server-a1c55d7e",
  [switch]$AllowDirty,
  [switch]$AllowNonProductionFunction,
  [switch]$SkipVersionBumpCheck,
  [switch]$RunSmoke,
  [switch]$SkipPostDeployValidation
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not available in PATH."
  }
}

function Invoke-CheckedCommand {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host "[HARDENED-DEPLOY] $Label"
  & $Command
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "$Label failed with exit code $exitCode."
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
Require-Command -Name "node"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot

try {
  if (-not $AllowNonProductionFunction.IsPresent -and $FunctionName -ne $ExpectedProductionFunction) {
    throw "Refusing deploy: FunctionName '$FunctionName' does not match expected production function '$ExpectedProductionFunction'. Use -AllowNonProductionFunction to override intentionally."
  }

  $gitState = Ensure-GitGuards -AllowDirtyTree:$AllowDirty.IsPresent
  $before = Get-FunctionState -Project $ProjectRef -Name $FunctionName
  $deployTimestampUtc = (Get-Date).ToUniversalTime().ToString("o")
  $apiBaseUrl = "https://$ProjectRef.supabase.co/functions/v1/$FunctionName"

  Write-Host "[HARDENED-DEPLOY] Project: $ProjectRef"
  Write-Host "[HARDENED-DEPLOY] Function: $FunctionName"
  Write-Host "[HARDENED-DEPLOY] Git: $($gitState.Branch) @ $($gitState.HeadShort)"
  Write-Host "[HARDENED-DEPLOY] Before: version=$($before.Version) updated=$($before.UpdatedAtUtc.ToString('u'))"

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $secretsOutput = & supabase secrets set DEPLOY_COMMIT_SHA=$($gitState.HeadLong) DEPLOY_COMMIT_SHORT=$($gitState.HeadShort) DEPLOYED_AT_UTC=$deployTimestampUtc DEPLOY_TARGET_FUNCTION=$FunctionName --project-ref $ProjectRef 2>&1
  $secretsExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  if ($secretsExitCode -ne 0) {
    $joined = ($secretsOutput | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
    throw "Unable to stamp deployment metadata secrets.`n$joined"
  }

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

  $previousApiBase = $env:API_BASE_URL
  $env:API_BASE_URL = $apiBaseUrl
  try {
    Invoke-CheckedCommand -Label "Live /version verification" -Command {
      node scripts/verify-live-version.mjs --base $apiBaseUrl --expected-function $FunctionName --expected-commit $($gitState.HeadLong)
    }

    if (-not $SkipPostDeployValidation.IsPresent) {
      Invoke-CheckedCommand -Label "Post-deploy endpoint inventory test" -Command {
        npm run test:tier2:endpoints
      }
      Invoke-CheckedCommand -Label "Post-deploy endpoint audit" -Command {
        npm run audit:endpoints
      }
    }
  }
  finally {
    $env:API_BASE_URL = $previousApiBase
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
    deploymentMetadata = [ordered]@{
      commitSha = $gitState.HeadLong
      commitShort = $gitState.HeadShort
      deployedAtUtc = $deployTimestampUtc
      apiBaseUrl = $apiBaseUrl
      expectedProductionFunction = $ExpectedProductionFunction
      enforcedTargetMatch = (-not $AllowNonProductionFunction.IsPresent)
      postDeployValidationSkipped = $SkipPostDeployValidation.IsPresent
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
