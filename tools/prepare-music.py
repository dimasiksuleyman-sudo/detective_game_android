"""Подготовка музыки для игры: бесшовная петля или разовый трек + выравнивание громкости.

Оригиналы (ElevenLabs Music) лежат в art/music/, готовые файлы — в public/audio/music/.
Параметры каждого трека — в TRACKS ниже; они же описаны в docs/AUDIO-PLAN.md.

Запуск из корня репозитория: python3 tools/prepare-music.py [id ...]
Нужен ffmpeg. Сеть и ключи не используются.

Петля (loop): берём оригинал с start по end и перекрёстно сводим его
последние xfade секунд с отрезком оригинала [start − xfade, start].
Петля заканчивается ровно там, где начинается, — шва не слышно. Нужно start ≥ xfade.

Разовый трек (once): отрезаем тишину по краям (start/end), добавляем короткие
fade_in/fade_out, чтобы не было щелчка на срезе.

В конце — loudnorm до lufs (пик ≤ −1,5 dBTP) и MP3 128 kbps.
"""

import os
import subprocess
import sys
import tempfile

SRC = "art/music"
OUT = "public/audio/music"

TRACKS = {
    # 120 с: фраза заканчивается к ~107 с, дальше затухание.
    # Первые 3 с — затухающая вступительная нота, новая фраза с ~3,3 с.
    "music-menu": dict(kind="loop", start=3.0, end=110.0, xfade=3.0, lufs=-18),
    # 120 с: 0,35 с тишины в начале, музыка до ~117 с, дальше затухание.
    # Фоновый трек — чуть тише меню, чтобы не мешать чтению.
    "music-investigation": dict(kind="loop", start=2.5, end=118.5, xfade=2.0, lufs=-20),
    # 60 с: начинается с удара, звучит до самого конца без затухания.
    # Удар в начале уходит в кроссфейд, петля начинается с 1-й секунды.
    "music-interrogation": dict(kind="loop", start=1.0, end=60.0, xfade=1.0, lufs=-20),
    # 30 с: начинается сразу, финальный аккорд затухает к ~29,5 с.
    "music-solved": dict(kind="once", start=0.0, end=29.6, fade_in=0.0, fade_out=0.4, lufs=-18),
    # 25 с: ~0,2 с тишины в начале, медленное вступление, тихий по замыслу.
    "music-unsolved": dict(kind="once", start=0.2, end=24.6, fade_in=0.05, fade_out=0.4, lufs=-20),
}


def run(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def loudnorm(lufs):
    return f"loudnorm=I={lufs}:TP=-1.5:LRA=11"


def prepare(track_id):
    t = TRACKS[track_id]
    src = os.path.join(SRC, track_id + ".mp3")
    dst = os.path.join(OUT, track_id + ".mp3")
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        full, body, head, mixed = (os.path.join(tmp, n) for n in ("full.wav", "a.wav", "b.wav", "m.wav"))
        run("-i", src, full)
        if t["kind"] == "loop":
            start, end, xfade = t["start"], t["end"], t["xfade"]
            if start < xfade:
                raise SystemExit(f"{track_id}: start must be >= xfade")
            run("-ss", str(start), "-to", str(end), "-i", full, body)
            run("-ss", str(start - xfade), "-t", str(xfade), "-i", full, head)
            run(
                "-i", body, "-i", head, "-filter_complex",
                f"[0:a][1:a]acrossfade=d={xfade}:c1=qsin:c2=qsin,{loudnorm(t['lufs'])}",
                "-ar", "44100", mixed,
            )
        else:
            length = t["end"] - t["start"]
            fades = []
            if t["fade_in"]:
                fades.append(f"afade=t=in:d={t['fade_in']}")
            fades.append(f"afade=t=out:st={length - t['fade_out']:.3f}:d={t['fade_out']}")
            run("-ss", str(t["start"]), "-to", str(t["end"]), "-i", full, body)
            run("-i", body, "-af", ",".join(fades + [loudnorm(t["lufs"])]), "-ar", "44100", mixed)
        run("-i", mixed, "-codec:a", "libmp3lame", "-b:a", "128k", dst)
    print("ready:", dst)


if __name__ == "__main__":
    for tid in sys.argv[1:] or TRACKS:
        prepare(tid)
