$LOG_ID = "6a82cbbc64db6e2c65dcdd9a"
$ISSUE_ID = "6a81f2bfdf43e262bbd24fc3"

Write-Host "--- Audit trail for this work log ---"
Invoke-RestMethod -Uri "http://localhost:8080/api/worklogs/$LOG_ID/audit"

Write-Host "--- Total hours for Task B ---"
Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$ISSUE_ID/worklogs/total"