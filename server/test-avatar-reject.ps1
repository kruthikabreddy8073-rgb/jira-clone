$USER_ID = "6a8421527df22c98f4134170"

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

# Fake PNG - actually plain text, but claiming image/png content type isn't sent here;
# instead we simulate a client sending the WRONG content type outright (e.g. text/plain)
"this is not really an image" | Out-File -FilePath "$PWD\fake-avatar.txt" -Encoding ascii
Upload-Avatar "Uploading a .txt file as an avatar (should be rejected)" "$PWD\fake-avatar.txt" "text/plain"

# Oversized file - 3MB of random bytes, over our 2MB limit
$bigBytes = New-Object byte[] (3 * 1024 * 1024)
(New-Object Random).NextBytes($bigBytes)
[System.IO.File]::WriteAllBytes("$PWD\big-avatar.png", $bigBytes)
Upload-Avatar "Uploading an oversized (3MB) PNG (should be rejected)" "$PWD\big-avatar.png" "image/png"