@echo off
REM Starts the local server for DEEPLINK (WebGPU and ES modules need http://localhost) and opens the game.
cd /d "%~dp0"
start "" http://localhost:8000/index.html
where py >nul 2>nul && (py -3 tools\serve.py 8000) || (python tools\serve.py 8000)
