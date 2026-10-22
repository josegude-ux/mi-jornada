# Servidor local privado de Control Jornada. Solo escucha en el propio ordenador (127.0.0.1).
$ErrorActionPreference='Stop'
$Port=8766
$Base=Split-Path -Parent $MyInvocation.MyCommand.Path
$Files=@{
 '/'='index.html';'/index.html'='index.html';'/styles.css'='styles.css';'/app.js'='app.js';'/data.js'='data.js';'/icon.svg'='icon.svg'
}
$Mime=@{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.svg'='image/svg+xml';'.webmanifest'='application/manifest+json';'.txt'='text/plain; charset=utf-8'}
$Server=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
try { $Server.Start() } catch { Write-Host "No se puede iniciar el puerto $Port. Cierra otras ventanas del servidor."; exit 1 }
Write-Host ''
Write-Host 'CONTROL JORNADA V0.8 - SOLO PRESENTACION' -ForegroundColor Cyan
Write-Host 'Solo accesible desde este ordenador. No publica datos en Internet.'
Write-Host 'Abriendo http://localhost:8766/index.html?v=080'
Write-Host 'Mantener abierta mientras se use la aplicacion.'
Write-Host 'Ctrl+C para detener.'
try { Start-Process 'http://localhost:8766/index.html?v=080' } catch { }
try {
 while ($true) {
  $Client=$Server.AcceptTcpClient()
  try {
   $Client.ReceiveTimeout=5000
   $Client.SendTimeout=5000
   $Stream=$Client.GetStream()
   $Reader=New-Object System.IO.StreamReader($Stream,[System.Text.Encoding]::ASCII,$false,1024,$true)
   $Line=$Reader.ReadLine()
   if (-not $Line) { continue }
   while($true) { $Head=$Reader.ReadLine(); if ([string]::IsNullOrEmpty($Head)) { break } }
   $Parts=$Line.Split(' ')
   $Method=$Parts[0]
   $Path=$Parts[1].Split('?')[0]
   $FileName=$Files[$Path]
   $Code=200; $Reason='OK'
   if (($Method -ne 'GET' -and $Method -ne 'HEAD') -or -not $FileName) { $Code=404; $Reason='Not Found' }
   $Full=if($FileName){Join-Path $Base $FileName}else{''}
   if ($Code -eq 200 -and -not (Test-Path -LiteralPath $Full -PathType Leaf)){$Code=404; $Reason='Not Found'}
   if ($Code -eq 200){ $Body=[System.IO.File]::ReadAllBytes($Full); $Ext=[IO.Path]::GetExtension($FileName); $Type=$Mime[$Ext] }
   else {$Body=[System.Text.Encoding]::UTF8.GetBytes('No disponible');$Type='text/plain; charset=utf-8'}
   $Headers="HTTP/1.1 $Code $Reason`r`nContent-Type: $Type`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nX-Frame-Options: DENY`r`nReferrer-Policy: no-referrer`r`nConnection: close`r`n`r`n"
   $Bytes=[System.Text.Encoding]::ASCII.GetBytes($Headers)
   $Stream.Write($Bytes,0,$Bytes.Length)
   if($Method -ne 'HEAD'){$Stream.Write($Body,0,$Body.Length)}
   $Stream.Flush()
  } catch { # Los navegadores pueden cerrar peticiones sin completar las cabeceras. No es un fallo de la aplicacion.
 }
  finally { if($Reader){$Reader.Dispose()};$Client.Close();$Reader=$null }
 }
} finally { $Server.Stop() }
