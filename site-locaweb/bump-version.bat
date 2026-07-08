@echo off
REM Atualiza automaticamente o ?v=... nos HTML antes de subir para o FTP.
REM Basta dar duplo-clique neste arquivo. Depois faca upload dos .html.

setlocal enabledelayedexpansion
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set dt=%%a
set V=!dt:~0,12!

powershell -NoProfile -Command ^
  "$v='%V%';" ^
  "Get-ChildItem -Path '%~dp0' -Filter *.html | ForEach-Object {" ^
  "  (Get-Content $_.FullName -Raw) -replace '(assets/(?:css|js)/[^\"''?]+)(?:\?v=[^\"'']*)?', ('$1?v=' + $v) | Set-Content $_.FullName -NoNewline" ^
  "}"

echo Versao atualizada para %V%
pause