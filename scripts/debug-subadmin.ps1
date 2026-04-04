$ErrorActionPreference = 'Stop'
$anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A'
$base = "https://gvqwvuqeenkusdayosty.supabase.co/rest/v1"
$h = @{ "apikey" = $anon; "Authorization" = "Bearer $anon" }

Write-Host "=== Admin invite records ==="
$invites = Invoke-RestMethod -Uri "$base/kv_store_a1c55d7e?key=like.admin%3Ainvite%3A*&select=key,value" -Headers $h
foreach ($row in $invites) {
  $json = $row.value | ConvertTo-Json -Compress
  Write-Host "KEY: $($row.key)"
  Write-Host "VAL: $json"
  Write-Host "---"
}

Write-Host ""
Write-Host "=== Sample users with referredByAdminId ==="
$users = Invoke-RestMethod -Uri "$base/kv_store_a1c55d7e?key=like.user%3A*&select=key,value&limit=20" -Headers $h
foreach ($row in $users) {
  $adminId = $row.value.referredByAdminId
  $invCode = $row.value.invitedByCode
  if ($adminId -or $invCode) {
    Write-Host "USER: $($row.key)  adminId=$adminId  invCode=$invCode"
  }
}

Write-Host ""
Write-Host "=== Total user count ==="
$allUsers = Invoke-RestMethod -Uri "$base/kv_store_a1c55d7e?key=like.user%3A*&select=key" -Headers $h
Write-Host "Total user records: $($allUsers.Count)"
