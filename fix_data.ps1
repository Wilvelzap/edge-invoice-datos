$json = Get-Content "c:\Users\wilve\OneDrive\Escritorio\datos Edge dasboards\data.json" -Raw
$js = "const rawDashboardData = $json;"
$js | Out-File "c:\Users\wilve\OneDrive\Escritorio\datos Edge dasboards\data.js" -Encoding utf8
