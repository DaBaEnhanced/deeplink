#!/bin/sh
cd "$(dirname "$0")/.."; i=0
for d in grid_city chrome_sea firewall archive fractal garden black_ice core calibration; do
  timeout 100 python3 test/shot.py "?capture&dive=$d&bot&from=drop2" /tmp/b_$i.png 9000 640 480 2>&1 | grep -iv "404\|experimental" | head -3; i=$((i+1))
done
python3 -c "
from PIL import Image
ims=[Image.open(f'/tmp/b_{i}.png').crop((80,60,560,420)) for i in range(9)]
S=Image.new('RGB',(480*3,360*3))
for i,im in enumerate(ims): S.paste(im,((i%3)*480,(i//3)*360))
S.save('/tmp/bosses.png')"
