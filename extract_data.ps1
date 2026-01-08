$sharedStringsPath = "c:\Users\wilve\OneDrive\Escritorio\datos Edge dasboards\extracted_excel\xl\sharedStrings.xml"
$sheetPath = "c:\Users\wilve\OneDrive\Escritorio\datos Edge dasboards\extracted_excel\xl\worksheets\sheet1.xml"
$outputPath = "c:\Users\wilve\OneDrive\Escritorio\datos Edge dasboards\data.json"

[xml]$ssXml = Get-Content $sharedStringsPath
$strings = $ssXml.sst.si.t

[xml]$sheetXml = [xml](Get-Content $sheetPath)
$rows = $sheetXml.worksheet.sheetData.row

$data = @()
$headers = @()

# Get headers from first row
$firstRow = $rows[0]
foreach ($c in $firstRow.c) {
    if ($c.t -eq "s") {
        $headers += $strings[[int]$c.v]
    } else {
        $headers += $c.v
    }
}

# Process data rows
for ($i = 1; $i -lt $rows.Count; $i++) {
    $r = $rows[$i]
    $obj = [ordered]@{}
    $cellIndex = 0
    foreach ($c in $r.c) {
        # Check if cell has a reference like A1, B1 etc to handle empty cells
        # But for now let's assume dense data for simplicity or handle indices
        # Simplified: map to headers by order
        $val = ""
        if ($c.t -eq "s") {
            $val = $strings[[int]$c.v]
        } else {
            $val = $c.v
        }
        
        if ($cellIndex -lt $headers.Count) {
            $header = $headers[$cellIndex]
            $obj[$header] = $val
        }
        $cellIndex++
    }
    $data += $obj
}

$data | ConvertTo-Json -Depth 10 | Out-File $outputPath -Encoding utf8
"Successfully extracted $($data.Count) rows to data.json"
