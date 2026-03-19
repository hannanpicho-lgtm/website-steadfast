$ErrorActionPreference = 'Stop'
$project = 'gvqwvuqeenkusdayosty'
$base = "https://$project.supabase.co/functions/v1/make-server-a1c55d7e"
$anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A'
$adminEmail = 'hillarydark6@gmail.com'
$adminPassword = '12341234'
$results = @()
function Add-Result([string]$step,[bool]$ok,[string]$detail) {
  $script:results += [pscustomobject]@{ Step=$step; Ok=$ok; Detail=$detail }
  $label = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host "[$label] $step :: $detail"
}

$authResp = Invoke-RestMethod -Method Post -Uri "https://$project.supabase.co/auth/v1/token?grant_type=password" -Headers @{ 'apikey'=$anon; 'Content-Type'='application/json' } -Body (@{ email=$adminEmail; password=$adminPassword } | ConvertTo-Json)
$adminJwt = $authResp.access_token
if (-not $adminJwt) { throw 'No admin access token returned.' }
Add-Result 'Admin sign-in' $true ('tokenLen=' + $adminJwt.Length)

$adminHeaders = @{ 'Content-Type'='application/json'; 'apikey'=$anon; 'Authorization'="Bearer $anon"; 'x-user-jwt'=$adminJwt }
$publicHeaders = @{ 'Content-Type'='application/json'; 'apikey'=$anon; 'Authorization'="Bearer $anon" }

$mine = Invoke-RestMethod -Method Get -Uri "$base/admin/invitation-codes/mine" -Headers $adminHeaders
$adminInviteCode = $mine.code
if (-not $adminInviteCode) { throw 'No admin invite code returned.' }
Add-Result 'Fetch admin invite code' $true ('code=' + $adminInviteCode)

$u = 'admreset_' + (Get-Random -Maximum 999999)
$initialLogin = 'InitPass123'
$initialTxn = 'InitTxn123'
$signup = Invoke-RestMethod -Method Post -Uri "$base/auth/signup" -Headers $publicHeaders -Body (@{ username=$u; phone='1234567890'; gender='male'; invitationCode=$adminInviteCode; loginPassword=$initialLogin; transactionPassword=$initialTxn } | ConvertTo-Json)
Add-Result 'Signup under admin scope' ($signup.ok -eq $true) ('username=' + $signup.user.username)

$reset = Invoke-RestMethod -Method Post -Uri "$base/admin/platform-users/$u/reset-credentials" -Headers $adminHeaders
$resetLogin = $reset.loginPassword
$resetTxn = $reset.transactionPassword
Add-Result 'Admin reset credentials' ($reset.ok -eq $true -and $resetLogin -and $resetTxn) ('mustChange=' + [bool]$reset.mustChangePassword)

$loginAfterReset = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Headers $publicHeaders -Body (@{ username=$u; loginPassword=$resetLogin } | ConvertTo-Json)
$userToken = $loginAfterReset.token
Add-Result 'User login after reset' ($loginAfterReset.ok -eq $true) ('mustChange=' + [bool]$loginAfterReset.mustChangePassword)

$newLogin = 'Recovered789'
$newTxn = 'RecoveredTxn789'
$changed = Invoke-RestMethod -Method Post -Uri "$base/auth/change-credentials" -Headers $publicHeaders -Body (@{ token=$userToken; currentLoginPassword=$resetLogin; newLoginPassword=$newLogin; newTransactionPassword=$newTxn } | ConvertTo-Json)
Add-Result 'User forced credential update' ($changed.ok -eq $true) 'updated both credentials'

Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Headers $publicHeaders -Body (@{ username=$u; loginPassword=$newLogin } | ConvertTo-Json) | Out-Null
Add-Result 'User login with changed credentials' $true 'login succeeded'

$results | Format-Table -AutoSize | Out-String -Width 220 | Write-Host
$failCount = ($results | Where-Object { -not $_.Ok }).Count
Write-Host "ADMIN_SMOKE_SUMMARY total=$($results.Count) failed=$failCount user=$u"
if ($failCount -gt 0) { exit 1 }
