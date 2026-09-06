$A_ID = "6a81f2bfdf43e262bbd24fc2"

Write-Host "--- Completing Task A ---"
$body = @{ title = "Task A"; status = "DONE" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$A_ID" -Method Put -Body $body -ContentType "application/json"

Write-Host "--- Checking notifications for u1 ---"
Invoke-RestMethod -Uri "http://localhost:8080/api/notifications/user/u1"