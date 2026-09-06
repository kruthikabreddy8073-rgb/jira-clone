$USER_ID = "6a8421527df22c98f4134170"

Write-Host "--- Requesting email change again to get the full link ---"
$body = @{ newEmail = "testuser2-new@example.com"; currentPassword = "OldPass123!" } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID/email-change" -Method Post -Body $body -ContentType "application/json"
Write-Host "Full link:" $result.devConfirmationLink

# Extract just the token from the link
$token = ($result.devConfirmationLink -split "token=")[1]
Write-Host "Extracted token:" $token

Write-Host "--- Confirming the email change ---"
try {
    $confirmed = Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID/email-change/confirm?token=$token" -Method Get
    $confirmed
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}