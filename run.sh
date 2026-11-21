#!/bin/sh
# Starts the local server for DEEPLINK and opens the game
cd "$(dirname "$0")"
( sleep 1; (xdg-open http://localhost:8000/index.html || open http://localhost:8000/index.html) >/dev/null 2>&1 ) &
python3 tools/serve.py 8000
