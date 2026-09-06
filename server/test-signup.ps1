try {
    $body = @{ name = "Test User"; email = "testuser2@example.com"; password = "OldPass123!" } | ConvertTo-Json
    $user = Invoke-RestMethod -Uri "http://localhost:8080/api/users/signup" -Method Post -Body $body -ContentType "application/json"
    $user
    Write-Host "USER_ID:" $user.id
} catch {
    Write-Host "Exception message:" $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body:" $reader.ReadToEnd()
    } else {
        Write-Host "No HTTP response was received at all (connection-level failure)."
    }
}