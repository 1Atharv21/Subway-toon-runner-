$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8089/")
$listener.Start()
Write-Host "Server running at http://localhost:8089/"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $relPath = $req.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($relPath)) { $relPath = 'index.html' }
        $path = [System.IO.Path]::Combine('c:\Users\SSGMCE\Desktop\ATHARV', $relPath)
        
        if (Test-Path $path -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($path).ToLower()
            switch ($ext) {
                '.html' { $res.ContentType = 'text/html' }
                '.css'  { $res.ContentType = 'text/css' }
                '.js'   { $res.ContentType = 'application/javascript' }
                '.json' { $res.ContentType = 'application/json' }
            }
            $bytes = [System.IO.File]::ReadAllBytes($path)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    } catch {
        # Ignore individual request errors
    }
}
