param(
  [switch]$Apply,
  [switch]$SkipDryRun,
  [string]$AdminEmail,
  [int]$TokenTtlSeconds = 600,
  [int]$TokenMaxUses = 1500
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-SupabaseInfo {
  param([string]$RepoRoot)

  $infoPath = Join-Path $RepoRoot 'utils\supabase\info.tsx'
  if (-not (Test-Path $infoPath)) {
    throw "Supabase info file not found: $infoPath"
  }

  $infoSource = Get-Content -Raw -Path $infoPath
  $projectIdMatch = [regex]::Match($infoSource, 'projectId\s*=\s*"([^"]+)"')
  $anonKeyMatch = [regex]::Match($infoSource, 'publicAnonKey\s*=\s*"([^"]+)"')

  if (-not $projectIdMatch.Success -or -not $anonKeyMatch.Success) {
    throw 'Unable to resolve projectId/publicAnonKey from utils/supabase/info.tsx'
  }

  return [pscustomobject]@{
    ProjectId = $projectIdMatch.Groups[1].Value
    AnonKey = $anonKeyMatch.Groups[1].Value
    FunctionUrl = "https://$($projectIdMatch.Groups[1].Value).supabase.co/functions/v1/make-server-a1c55d7e"
    AuthUrl = "https://$($projectIdMatch.Groups[1].Value).supabase.co/auth/v1/token?grant_type=password"
  }
}

function ConvertTo-PlainText {
  param([Security.SecureString]$SecureValue)

  if ($null -eq $SecureValue) {
    return ''
  }

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

$repoRoot = (Get-Location).Path
$supabaseInfo = Get-SupabaseInfo -RepoRoot $repoRoot

if (-not $AdminEmail) {
  $AdminEmail = Read-Host 'Admin email'
}

$passwordSecure = Read-Host 'Admin password' -AsSecureString
$plainPassword = ConvertTo-PlainText -SecureValue $passwordSecure

if (-not $AdminEmail -or -not $plainPassword) {
  throw 'Admin email and password are required.'
}

$tokenHeaders = @{
  apikey = $supabaseInfo.AnonKey
  'Content-Type' = 'application/json'
}

$issueHeaders = @{
  Authorization = "Bearer $($supabaseInfo.AnonKey)"
  apikey = $supabaseInfo.AnonKey
  Origin = 'https://steadfastworkbench.org'
  'Content-Type' = 'application/json'
}

try {
  $authResponse = Invoke-RestMethod -Method Post -Uri $supabaseInfo.AuthUrl -Headers $tokenHeaders -Body (@{
    email = $AdminEmail
    password = $plainPassword
  } | ConvertTo-Json)

  if (-not $authResponse.access_token) {
    throw 'Supabase auth response did not include an access token.'
  }

  $issueHeaders['x-user-jwt'] = $authResponse.access_token
  $scriptTokenResponse = Invoke-RestMethod -Method Post -Uri "$($supabaseInfo.FunctionUrl)/admin/script-tokens" -Headers $issueHeaders -Body (@{
    scopes = @('platform-users:reconcile')
    ttlSeconds = $TokenTtlSeconds
    maxUses = $TokenMaxUses
    label = 'reconcile-platform-users-tasksets'
  } | ConvertTo-Json)

  if (-not $scriptTokenResponse.scriptToken) {
    throw 'Script token exchange failed. Response did not include scriptToken.'
  }

  $env:SUPABASE_ADMIN_SCRIPT_TOKEN = $scriptTokenResponse.scriptToken
  Remove-Item Env:SUPABASE_ADMIN_TEST_JWT -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_SUB_ADMIN_TEST_JWT -ErrorAction SilentlyContinue

  Write-Host "Issued scoped script token expiring at $($scriptTokenResponse.expiresAt) with $($scriptTokenResponse.remainingUses) uses." -ForegroundColor Cyan

  if (-not $SkipDryRun) {
    Write-Host 'Running dry-run reconciliation...' -ForegroundColor Yellow
    npm run reconcile:users:tasksets:dry
    if ($LASTEXITCODE -ne 0) {
      throw "Dry-run reconciliation failed with exit code $LASTEXITCODE."
    }
  }

  $shouldApply = $Apply.IsPresent
  if (-not $shouldApply) {
    $confirmation = Read-Host 'Run live reconciliation now? (y/N)'
    $shouldApply = $confirmation -match '^(y|yes)$'
  }

  if ($shouldApply) {
    Write-Host 'Running live reconciliation...' -ForegroundColor Yellow
    npm run reconcile:users:tasksets
    if ($LASTEXITCODE -ne 0) {
      throw "Live reconciliation failed with exit code $LASTEXITCODE."
    }
  }
  else {
    Write-Host 'Live reconciliation skipped.' -ForegroundColor DarkYellow
  }
}
finally {
  Remove-Item Env:SUPABASE_ADMIN_SCRIPT_TOKEN -ErrorAction SilentlyContinue
  $plainPassword = ''
}
