$PROJECT_ID = "6a81f114df43e262bbd24fbf"

$bodyA = @{ title = "Task A"; projectId = $PROJECT_ID; type = "TASK" } | ConvertTo-Json
$issueA = Invoke-RestMethod -Uri "http://localhost:8080/api/issues" -Method Post -Body $bodyA -ContentType "application/json"
Write-Host "--- Task A created ---"
$issueA

$bodyB = @{ title = "Task B"; projectId = $PROJECT_ID; type = "TASK"; assigneeId = "u1" } | ConvertTo-Json
$issueB = Invoke-RestMethod -Uri "http://localhost:8080/api/issues" -Method Post -Body $bodyB -ContentType "application/json"
Write-Host "--- Task B created ---"
$issueB

Write-Host "--- A_ID and B_ID ---"
Write-Host "A_ID:" $issueA.id
Write-Host "B_ID:" $issueB.id