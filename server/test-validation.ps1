$ISSUE_ID = "6a81f2bfdf43e262bbd24fc3"
$USER_ID = "u1"

function Try-Log($label, $body) {
    Write-Host "--- $label ---"
    try {
        $json = $body | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:8080/api/issues/$ISSUE_ID/worklogs?actingUserId=$USER_ID" -Method Post -Body $json -ContentType "application/json"
    } catch {
        Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body:" $reader.ReadToEnd()
    }
}

Try-Log "Negative hours (should fail)" @{ workDate = (Get-Date).ToString("yyyy-MM-dd"); hours = -3; description = "bad entry" }

Try-Log "Zero hours (should fail)" @{ workDate = (Get-Date).ToString("yyyy-MM-dd"); hours = 0; description = "bad entry" }

Try-Log "Future date (should fail)" @{ workDate = (Get-Date).AddDays(5).ToString("yyyy-MM-dd"); hours = 2; description = "future work" }

Try-Log "Missing description (should fail)" @{ workDate = (Get-Date).ToString("yyyy-MM-dd"); hours = 2 }