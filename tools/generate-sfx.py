"""Процедурный синтез звуков интерфейса «Комнаты допросов» (без нейросетей и сети).

Запуск из корня репозитория: python3 tools/generate-sfx.py [папка-вывода]
По умолчанию пишет MP3 128 kbps в public/audio/sfx/. Нужны numpy и ffmpeg.
Сид ГПСЧ фиксирован, поэтому результат воспроизводим. Список звуков — docs/AUDIO-PLAN.md.
"""
import numpy as np, wave, subprocess, os, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/audio/sfx'
os.makedirs(OUT, exist_ok=True)
SR=44100; rng=np.random.default_rng(7)
def t(d): return np.arange(int(SR*d))/SR
def band(x, lo, hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR)
    m=((f>=lo)&(f<=hi)).astype(float)
    # soft edges
    m=np.convolve(m,np.hanning(64)/np.hanning(64).sum(),'same')
    return np.fft.irfft(X*m,len(x))
def env(n, a=0.002, d=0.1):
    tt=np.arange(n)/SR; e=np.minimum(1,tt/max(a,1e-4))*np.exp(-np.maximum(0,tt-a)/d); return e
def norm(x, peak=0.8): return x/ (np.max(np.abs(x))+1e-9)*peak
def rev(x, amt=0.25, dec=0.6):
    n=int(SR*dec); ir=rng.standard_normal(n)*np.exp(-np.arange(n)/SR/(dec/5)); ir=band(ir,200,6000)
    y=np.convolve(x,ir)[:len(x)+n]; y=y/np.max(np.abs(y)+1e-9)
    out=np.zeros(len(y)); out[:len(x)]+=x/np.max(np.abs(x)+1e-9); return out*(1-amt)+y*amt
def fm(freq, d, ratio=1.0, index=1.5, decay=0.8):
    tt=t(d); mod=index*np.exp(-tt/0.3)*np.sin(2*np.pi*freq*ratio*tt)
    return np.sin(2*np.pi*freq*tt+mod)*env(len(tt),0.005,decay)
def save(name, x, peak=0.8):
    name=os.path.join(OUT,name)
    x=norm(x,peak); pcm=(x*32767).astype(np.int16)
    with wave.open(name+'.wav','wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',name+'.wav','-codec:a','libmp3lame','-b:a','128k',name+'.mp3'],check=True); os.remove(name+'.wav')
def place(total, items):
    out=np.zeros(int(SR*total))
    for at,s in items:
        i=int(SR*at); out[i:i+len(s)]+=s[:len(out)-i]
    return out
# 1 UI tap
n=int(SR*0.06); tap=band(rng.standard_normal(n),800,5000)*env(n,0.0005,0.006)+0.6*np.sin(2*np.pi*180*t(0.06))*env(n,0.001,0.015)
save('ui-tap', tap, 0.5)
# 2 typewriter keys + bell (new fact)
def key():
    n=int(SR*0.09); s=band(rng.standard_normal(n),1500,7000)*env(n,0.0003,0.004)
    body=band(rng.standard_normal(n),300,1200)*env(n,0.001,0.02)*0.7
    return s+body
bell_t=t(1.6); bell=sum(a*np.sin(2*np.pi*f*bell_t)*np.exp(-bell_t/dk) for f,a,dk in [(2093,1,0.6),(4186*1.002,0.35,0.3),(5274,0.2,0.2),(2093*2.76,0.15,0.15)])*np.minimum(1,bell_t/0.002)
tw=place(2.3,[(0.0,key()),(0.11,key()),(0.19,key()),(0.33,key()),(0.42,key()),(0.62,bell*0.6)])
save('new-fact', rev(tw,0.15,0.4))
# 3 handover chime (Rhodes-like D4 -> A4)
ch=place(2.2,[(0.0,fm(293.66,1.8,1,1.2,0.7)),(0.0,0.5*fm(293.66*2,1.6,1,0.8,0.5)),(0.28,fm(440,1.8,1,1.2,0.8)),(0.28,0.4*fm(554.37,1.6,1,0.8,0.6))])
save('handover', rev(ch,0.3,1.2), 0.6)
# 4 hold progress ticks + confirm
ticks=[(i*0.1, (band(rng.standard_normal(int(SR*0.03)),2000+i*300,6000)*env(int(SR*0.03),0.0005,0.005))*(0.4+i*0.05)) for i in range(10)]
conf=fm(587.33,0.9,2,1.0,0.35)+0.6*fm(880,0.9,2,0.8,0.35)
save('hold-confirm', place(2.2,ticks+[(1.02,conf)]), 0.6)
# 5 error: muted double thud
def thud(): n=int(SR*0.18); return np.sin(2*np.pi*90*t(0.18)*np.exp(-t(0.18)*3))*env(n,0.002,0.05)+0.3*band(rng.standard_normal(n),100,600)*env(n,0.001,0.03)
save('error', place(0.6,[(0,thud()),(0.16,thud())]), 0.6)
# 6 rain loop 12s (seamless)
L=12; n=int(SR*L); base=band(rng.standard_normal(n+SR),300,9000)*0.5+band(rng.standard_normal(n+SR),80,400)*0.6
drops=np.zeros(n+SR)
for _ in range(900):
    i=rng.integers(0,n+SR-2000); f=rng.uniform(1500,5000); d=rng.uniform(0.004,0.02); m=int(SR*d)
    drops[i:i+m]+=np.sin(2*np.pi*f*np.arange(m)/SR*(1-np.arange(m)/m*0.3))*np.exp(-np.arange(m)/m*6)*rng.uniform(0.05,0.3)
x=base+drops; fade=SR; loop=x[:n].copy(); ramp=np.linspace(0,1,fade)
loop[:fade]=x[:fade]*ramp+x[n:n+fade]*(1-ramp)
save('rain-loop', loop, 0.5)
# 7 break sting: piano-ish low hit + cymbal swell + muted brass-ish stab
tt=t(4.0); piano=sum((1/k)*np.sin(2*np.pi*73.42*k*np.sqrt(1+0.0004*k*k)*tt)*np.exp(-tt/(1.8/k**0.5)) for k in range(1,12))*np.minimum(1,tt/0.003)
sw_n=int(SR*1.2); swell=band(rng.standard_normal(sw_n),5000,14000)*np.linspace(0,1,sw_n)**2
br_t=t(1.2); brass=sum(np.sin(2*np.pi*f*k*br_t)/k for f in (293.66,349.23,415.3) for k in range(1,7))*env(len(br_t),0.02,0.25)
st=place(4.6,[(0.0,swell*0.4),(1.2,piano),(1.2,brass*0.18)])
save('sting-break', rev(st,0.35,1.8), 0.8)
# 8 paper / page turn (open clue)
n=int(SR*0.5); pp=band(rng.standard_normal(n),1000,8000)*(np.sin(np.pi*np.arange(n)/n)**3)*(1+0.5*np.sin(2*np.pi*23*np.arange(n)/SR))
save('paper', pp, 0.5)
print(sorted(os.listdir(OUT)))
