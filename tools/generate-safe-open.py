"""Детерминированный короткий щелчок засова и открытие сейфа, без сети."""
import math, random, wave, subprocess, tempfile
from pathlib import Path
sr=44100;rng=random.Random(1408);pcm=[]
for i in range(sr):
 t=i/sr;v=0.
 for at in (0.,.14,.32):
  u=t-at
  if u>=0:v+=(math.sin(2*math.pi*160*u)+.4*math.sin(2*math.pi*970*u))*math.exp(-u*32)*.25
 if .22<t<.88:v+=rng.uniform(-1,1)*.08*math.sin(math.pi*(t-.22)/.66)**2
 pcm.append(int(max(-.9,min(.9,v))*32767))
with tempfile.TemporaryDirectory() as folder:
 p=Path(folder)/'safe-open.wav'
 with wave.open(str(p),'wb') as out:
  import struct
  out.setparams((1,2,sr,0,'NONE','not compressed'));out.writeframes(struct.pack('<'+'h'*len(pcm),*pcm))
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(p),'-codec:a','libmp3lame','-b:a','128k','public/audio/sfx/safe-open.mp3'],check=True)
