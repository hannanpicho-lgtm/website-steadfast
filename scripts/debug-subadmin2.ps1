$ErrorActionPreference = 'Stop'
$anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A'
$project = 'gvqwvuqeenkusdayosty'
$authBase = "https://$project.supabase.co/auth/v1"
$fnBase = "https://$project.supabase.co/functions/v1/make-server-a1c55d7e"

# First login as super-admin to get admin JWT and query data
Write-Host "=== Logging in as super-admin (hillarydark6@gmail.com) ==="
$loginBody = @{ email = 'hillarydark6@gmail.com'; password = '12341234' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$authBase/token?grant_type=password" -Method POST -Headers @{ "apikey" = $anon; "Content-Type" = "application/json" } -Body $loginBody
$jwt = $loginResp.access_token
$superUserId = $loginResp.user.id
$superRole = $loginResp.user.app_metadata.role
Write-Host "Super-admin ID: $superUserId"
Write-Host "Super-admin role: $superRole"

# List all admin invitation codes (super-admin only)
Write-Host ""
Write-Host "=== All admin invitation codes ==="
$codesResp = Invoke-RestMethod -Uri "$fnBase/admin/invitation-codes" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
$codesResp | ConvertTo-Json -Depth 5 | Write-Host

# Get all platform users via super-admin to see referredByAdminId distribution
Write-Host ""
Write-Host "=== Platform users (super-admin view) ==="
$usersResp = Invoke-RestMethod -Uri "$fnBase/admin/platform-users" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
Write-Host "Total users: $($usersResp.total)"
Write-Host "Scoped: $($usersResp.scoped)"

# Group by referredByAdminId
$grouped = $usersResp.users | Group-Object -Property referredByAdminId
Write-Host ""
Write-Host "=== Users grouped by referredByAdminId ==="
foreach ($g in $grouped) {
  Write-Host "  AdminId='$($g.Name)' -> $($g.Count) users (referredByAdminName='$($g.Group[0].referredByAdminName)')"
}

# Show admin users list
Write-Host ""
Write-Host "=== Admin users ==="
$adminUsersResp = Invoke-RestMethod -Uri "$fnBase/admin/users" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
foreach ($au in $adminUsersResp.users) {
  Write-Host "  ID=$($au.id) Email=$($au.email) Role=$($au.role) RoleName=$($au.roleName)"
}
