$ErrorActionPreference = 'Stop'
$anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A'
$project = 'gvqwvuqeenkusdayosty'
$authBase = "https://$project.supabase.co/auth/v1"
$fnBase = "https://$project.supabase.co/functions/v1/make-server-a1c55d7e"

# Login as the sub-admin
Write-Host "=== Logging in as hillarydark8@gmail.com ==="
$loginBody = @{ email = 'hillarydark8@gmail.com'; password = '12341234' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$authBase/token?grant_type=password" -Method POST -Headers @{ "apikey" = $anon; "Content-Type" = "application/json" } -Body $loginBody
$jwt = $loginResp.access_token
$userId = $loginResp.user.id
$userRole = $loginResp.user.app_metadata.role
Write-Host "User ID: $userId"
Write-Host "Role: $userRole"
Write-Host "Role claim: $($loginResp.user.app_metadata | ConvertTo-Json -Compress)"

# Check invitation code
Write-Host ""
Write-Host "=== Checking admin invitation code ==="
$codeResp = Invoke-RestMethod -Uri "$fnBase/admin/invitation-codes/mine" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
Write-Host "My invitation code: $($codeResp | ConvertTo-Json -Compress)"

# Call platform-users
Write-Host ""
Write-Host "=== Calling platform-users ==="
$usersResp = Invoke-RestMethod -Uri "$fnBase/admin/platform-users" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
Write-Host "Total users: $($usersResp.total)"
Write-Host "Scoped: $($usersResp.scoped)"
Write-Host "ScopeFallbackApplied: $($usersResp.scopeFallbackApplied)"
if ($usersResp.users -and $usersResp.users.Count -gt 0) {
  Write-Host "First 5 users:"
  $usersResp.users | Select-Object -First 5 | ForEach-Object { Write-Host "  - $($_.username) (adminId=$($_.referredByAdminId))" }
} else {
  Write-Host "NO USERS FOUND"
}
