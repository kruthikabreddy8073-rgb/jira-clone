$USER_ID = "6a8421527df22c98f4134170"

Write-Host "--- Requesting email change ---"
try {
    $body = @{ newEmail = "testuser2-new@example.com"; currentPassword = "OldPass123!" } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID/email-change" -Method Post -Body $body -ContentType "application/json"
    $result
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}