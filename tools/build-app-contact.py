from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
fg=Image.open('art/app/icon-foreground.png');bg=Image.open('art/app/icon-background.png').convert('RGBA');bg.alpha_composite(fg);base=bg.crop((171,171,853,853))
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
sheet=Image.new('RGB',(1440,900),'#36434a');d=ImageDraw.Draw(sheet)
for row,shape in enumerate(['Круг','Скруглённый квадрат','Капля']):
 for col,(wall,size) in enumerate([(w,s) for w in ['#EDE4D3','#12181D'] for s in [192,96,48]]):
  x,y=col*240,row*300;d.rectangle((x,y,x+239,y+299),fill=wall);d.text((x+12,y+12),shape,fill='#C9B48F' if wall=='#12181D' else '#1E2A33',font=font);d.text((x+12,y+265),str(size)+' px',fill='#C9B48F' if wall=='#12181D' else '#1E2A33',font=font)
  mask=Image.new('L',(192,192));m=ImageDraw.Draw(mask)
  if row==0:m.ellipse((0,0,191,191),fill=255)
  elif row==1:m.rounded_rectangle((0,0,191,191),radius=43,fill=255)
  else:
   m.ellipse((0,0,191,191),fill=255);m.rectangle((96,96,191,191),fill=255)
  icon=base.resize((size,size),Image.Resampling.LANCZOS);mask=mask.resize((size,size),Image.Resampling.LANCZOS);sheet.paste(icon,(x+(240-size)//2,y+60+(192-size)//2),mask)
sheet.save('docs/devlog/assets/app-icon/contact-sheet.jpg',quality=92)
