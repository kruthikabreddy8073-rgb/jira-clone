$LOG_ID = "6a82cbbc64db6e2c65dcdd9a"

Write-Host "LOG_ID being used:" $LOG_ID

Write-Host "--- Edit attempt by unrelated user 'random_user' (should fail - not assignee/PM) ---"
try {
    $body = @{ workDate = (Get-Date).ToString("yyyy-MM-dd"); hours = 3; description = "trying to edit as stranger" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/worklogs/$LOG_ID`?actingUserId=random_user&confirmed=true" -Method Put -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}

Write-Host "--- Edit attempt by u1 (assignee) WITHOUT confirmation (should fail) ---"
try {
    $body = @{ workDate = (Get-Date).ToString("yyyy-MM-dd"); hours = 3; description = "editing without confirming" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/worklogs/$LOG_ID`?actingUserId=u1&confirmed=false" -Method Put -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}

Write-Host "--- Edit attempt by u1 (assignee) WITH confirmation (should succeed) ---"
try {
    $body = @{ workDate = (Get-Date).ToString("yyyy-MM-dd"); hours = 3; description = "corrected entry" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/worklogs/$LOG_ID`?actingUserId=u1&confirmed=true" -Method Put -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}