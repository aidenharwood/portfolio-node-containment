#!/bin/sh
cd /c/Users/aiden/Documents/portfolio/portfolio-node-containment
node scripts/_move.mjs "$1" >/dev/null
node C:/Users/aiden/AppData/Local/Temp/claude/429b5cc849355cac/83bdb4c7-ab8b-4d3a-a192-cc3ae5a7efb6/scratchpad/gamePreview.mjs >/dev/null 2>&1 &
sleep 10
timeout 150 node scripts/_shoot.mjs "[{\"wait\":5000,\"js\":\"document.querySelectorAll('.hud-top-right,.hud-bottom-right,aside').forEach(e=>e.style.visibility='hidden');1\"},{\"wait\":60000,\"shot\":\"$2\"}]"
powershell -Command "\$p = (Get-NetTCPConnection -State Listen -LocalPort 7421).OwningProcess; \$pp = (Get-CimInstance Win32_Process -Filter \"ProcessId=\$p\").ParentProcessId; \$gp = (Get-CimInstance Win32_Process -Filter \"ProcessId=\$pp\").ParentProcessId; taskkill /PID \$gp /T /F | Out-Null"
sleep 2
