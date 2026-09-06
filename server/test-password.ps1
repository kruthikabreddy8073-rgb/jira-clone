$USER_ID = "6a8421527df22c98f4134170"

function Try-ChangePassword($label, $currentPass, $newPass) {
    Write-Host "--- $label ---"
    try {
        $body = @{ currentPassword = $currentPass; newPassword = $newPass } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID/password" -Method Put -Body $body -ContentType "application/json"
    } catch {
        Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body:" $reader.ReadToEnd()
    }
}

Try-ChangePassword "Wrong current password (should fail)" "WrongPassword!" "NewStrong123!"
Try-ChangePassword "Weak new password - no special char (should fail)" "OldPass123!" "weakpassword1"
Try-ChangePassword "Weak new password - too short (should fail)" "OldPass123!" "Ab1!"
Try-ChangePassword "Same as current password (should fail)" "OldPass123!" "OldPass123!"
Try-ChangePassword "Valid change (should succeed)" "OldPass123!" "NewStrong123!"

Write-Host "--- Confirming old password no longer works ---"
try {
    $body = @{ email = "testuser2-new@example.com"; password = "OldPass123!" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/users/login" -Method Post -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}

Write-Host "--- Confirming new password works ---"
try {
    $body = @{ email = "testuser2-new@example.com"; password = "NewStrong123!" } | ConvertTo-Json
    $user = Invoke-RestMethod -Uri "http://localhost:8080/api/users/login" -Method Post -Body $body -ContentType "application/json"
    $user
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}