$A_ID = "6a81f2bfdf43e262bbd24fc2"
$B_ID = "6a81f2bfdf43e262bbd24fc3"

Write-Host "--- Adding dependency: B depends on A ---"
Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$B_ID/dependencies/$A_ID" -Method Post

Write-Host "--- Trying to start B before A is done (should fail) ---"
try {
    $body = @{ title = "Task B"; status = "IN_PROGRESS"; assigneeId = "u1" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$B_ID" -Method Put -Body $body -ContentType "application/json"
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}

Write-Host "--- Trying to create a circular dependency: A depends on B (should fail) ---"
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$A_ID/dependencies/$B_ID" -Method Post
} catch {
    Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}