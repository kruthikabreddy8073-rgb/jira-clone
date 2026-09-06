$ISSUE_ID = "6a81f2bfdf43e262bbd24fc3"   # Task B, assignee u1
$USER_ID = "u1"

Write-Host "--- Logging valid time ---"
try {
    $body = @{ workDate = (Get-Date).ToString("yyyy-MM-dd"); hours = 2.5; description = "Investigated the bug" } | ConvertTo-Json
    $log = Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$ISSUE_ID/worklogs?actingUserId=$USER_ID" -Method Post -Body $body -ContentType "application/json"
    $log
    Write-Host "LOG_ID:" $log.id
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}