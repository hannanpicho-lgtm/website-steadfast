$ErrorActionPreference = 'Stop'
$anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A'
$project = 'gvqwvuqeenkusdayosty'
$authBase = "https://$project.supabase.co/auth/v1"
$fnBase = "https://$project.supabase.co/functions/v1/make-server-a1c55d7e"

# Login as hillarydark6 (the admin we know credentials for)
Write-Host "=== Logging in as hillarydark6@gmail.com ==="
$loginBody = @{ email = 'hillarydark6@gmail.com'; password = '12341234' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$authBase/token?grant_type=password" -Method POST -Headers @{ "apikey" = $anon; "Content-Type" = "application/json" } -Body $loginBody
$jwt = $loginResp.access_token
$userId = $loginResp.user.id
Write-Host "User ID: $userId"
Write-Host "Role: $($loginResp.user.app_metadata.role)"
Write-Host "Roles: $($loginResp.user.app_metadata.roles -join ', ')"

# Get my invitation code
Write-Host ""
Write-Host "=== My invitation code ==="
try {
  $codeResp = Invoke-RestMethod -Uri "$fnBase/admin/invitation-codes/mine" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
  Write-Host ($codeResp | ConvertTo-Json -Compress)
} catch {
  Write-Host "Error: $($_.Exception.Message)"
}

# Get platform users (scoped to this admin)
Write-Host ""
Write-Host "=== Platform users (my scope) ==="
try {
  $usersResp = Invoke-RestMethod -Uri "$fnBase/admin/platform-users" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
  Write-Host "Total users: $($usersResp.total)"
  Write-Host "Scoped: $($usersResp.scoped)"
  Write-Host "ScopeFallbackApplied: $($usersResp.scopeFallbackApplied)"
  if ($usersResp.users -and $usersResp.users.Count -gt 0) {
    Write-Host "Users:"
    foreach ($u in $usersResp.users) {
      Write-Host "  $($u.username) vip=$($u.vipLevel) balance=$($u.balance) adminId=$($u.referredByAdminId) invCode=$($u.invitationCode)"
    }
  } else {
    Write-Host "NO USERS FOUND for this admin"
  }
} catch {
  Write-Host "Error: $($_.Exception.Message)"
}
