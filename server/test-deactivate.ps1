$USER_ID = "6a8421527df22c98f4134170"

Write-Host "--- Deactivating account (wrong password, should fail) ---"
try {
    $body = @{ currentPassword = "WrongPassword!" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID/deactivate" -Method Post -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}

Write-Host "--- Deactivating account (correct password, should succeed) ---"
try {
    $body = @{ currentPassword = "NewStrong123!" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID/deactivate" -Method Post -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}

Write-Host "--- Trying to log in while deactivated (should fail) ---"
try {
    $body = @{ email = "testuser2-new@example.com"; password = "NewStrong123!" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/users/login" -Method Post -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}

Write-Host "--- Confirming user record still exists (historical data preserved) ---"
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
}

Write-Host "--- Reactivating account ---"
Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID/reactivate" -Method Post

Write-Host "--- Confirming login works again ---"
try {
    $body = @{ email = "testuser2-new@example.com"; password = "NewStrong123!" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/users/login" -Method Post -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}