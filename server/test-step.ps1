$SUB_ID = "6a81f1d3df43e262bbd24fc1"
$PARENT_ID = "6a81f165df43e262bbd24fc0"

$body1 = @{ title = "Subtask 1"; status = "DONE" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$SUB_ID" -Method Put -Body $body1 -ContentType "application/json"

Write-Host "---now retry parent---"

$body2 = @{ title = "Parent Task"; status = "DONE" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$PARENT_ID" -Method Put -Body $body2 -ContentType "application/json"