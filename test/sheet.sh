#!/bin/sh
# contact sheet of every layer kit: test/sheet.sh <from-seconds> <out.png> [extra url params]
cd "$(dirname "$0")/.."
FROM=${1:-70}; OUT=${2:-/tmp/sheet.png}; EXTRA=$3; i=0
for d in calibration grid_city chrome_sea firewall archive fractal garden black_ice core; do
  timeout 100 python3 test/shot.py "?capture&dive=$d&bot&from=$FROM$EXTRA" /tmp/k_$i.png ${WAIT:-9000} 640 480 2>&1 | grep -iv "404\|experimental" | head -3
  i=$((i+1))
done
python3 -c "
from PIL import Image
ims=[Image.open(f'/tmp/k_{i}.png').crop((80,60,560,420)) for i in range(9)]
S=Image.new('RGB',(480*3,360*3))
for i,im in enumerate(ims): S.paste(im,((i%3)*480,(i//3)*360))
S.save('$OUT')"
