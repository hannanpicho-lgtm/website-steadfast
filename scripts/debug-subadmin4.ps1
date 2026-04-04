$ErrorActionPreference = 'Stop'
$anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A'
$project = 'gvqwvuqeenkusdayosty'
$authBase = "https://$project.supabase.co/auth/v1"
$fnBase = "https://$project.supabase.co/functions/v1/make-server-a1c55d7e"

# Login as hillarydark6 (known credentials)
$loginBody = @{ email = 'hillarydark6@gmail.com'; password = '12341234' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$authBase/token?grant_type=password" -Method POST -Headers @{ "apikey" = $anon; "Content-Type" = "application/json" } -Body $loginBody
$jwt = $loginResp.access_token

# Get admin users list (this should work for any admin)
Write-Host "=== Admin users list ==="
try {
  $adminUsersResp = Invoke-RestMethod -Uri "$fnBase/admin/users" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
  if ($adminUsersResp.users) {
    foreach ($au in $adminUsersResp.users) {
      Write-Host "  ID=$($au.id)"
      Write-Host "  Email=$($au.email)"
      Write-Host "  Role=$($au.role) RoleName=$($au.roleName)"
      Write-Host "  InviteCode=$($au.invitationCode)"
      Write-Host "  ---"
    }
  } else {
    Write-Host "Response: $($adminUsersResp | ConvertTo-Json -Compress)"
  }
} catch {
  Write-Host "Error (probably needs super_admin): $($_.Exception.Message)"
  
  # Try the invitation-codes/mine endpoint instead - it tells us THIS admin's code
  Write-Host ""
  Write-Host "=== hillarydark8's admin ID from screenshot: e2fba496-c261-41f3-9c80-4cf8f9cde983 ==="
  
  # Check what KV records exist for this admin ID via admin endpoint
  Write-Host "Since we can't login as hillarydark8, checking KV directly..."
}

# Check dashboard endpoint for insight
Write-Host ""
Write-Host "=== Dashboard overview (check version) ==="
$dashResp = Invoke-RestMethod -Uri "$fnBase/admin/dashboard" -Headers @{ "Authorization" = "Bearer $anon"; "x-user-jwt" = $jwt; "apikey" = $anon }
if ($dashResp) {
  Write-Host "API commit: $($dashResp.deployment.commitShort)"
  Write-Host "Deployed at: $($dashResp.deployment.deployedAtUtc)"
  Write-Host "Stale: $($dashResp.deployment.stale)"
}
