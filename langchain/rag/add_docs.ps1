$jsonPath = Join-Path $PSScriptRoot "add_docs.json"
$json = Get-Content $jsonPath -Raw

Invoke-RestMethod -Uri "http://localhost:8000/documents/batch" `
    -Method POST `
    -Body $json `
    -ContentType "application/json"

