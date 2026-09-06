$USER_ID = "6a8421527df22c98f4134170"
$filePath = "$PWD\test-avatar.png"

function Upload-Avatar($label, $filePath, $contentType) {
    Write-Host "--- $label ---"
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $fileName = [System.IO.Path]::GetFileName($filePath)
        $boundary = [System.Guid]::NewGuid().ToString()

        $bodyLines = (
            "--$boundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
            "Content-Type: $contentType",
            "",
            [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($fileBytes),
            "--$boundary--",
            ""
        ) -join "`r`n"

        $bodyBytes = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetBytes($bodyLines)

        $result = Invoke-RestMethod -Uri "http://localhost:8080/api/users/$USER_ID/avatar" `
            -Method Post `
            -ContentType "multipart/form-data; boundary=$boundary" `
            -Body $bodyBytes

        $result
    } catch {
        Write-Host "Status code:" $_.Exception.Response.StatusCode.value__
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Body:" $reader.ReadToEnd()
    }
}

Upload-Avatar "Uploading a valid small PNG (should succeed)" $filePath "image/png"