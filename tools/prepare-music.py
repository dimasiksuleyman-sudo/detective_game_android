"""Подготовка музыки для игры: бесшовная петля + выравнивание громкости.

Оригиналы (ElevenLabs Music) лежат в art/music/, готовые файлы — в public/audio/music/.
Параметры каждого трека — в TRACKS ниже; они же описаны в docs/AUDIO-PLAN.md.

Запуск из корня репозитория: python3 tools/prepare-music.py [id ...]
Нужен ffmpeg. Сеть и ключи не используются.

Петля строится так: берём оригинал с loop_start по loop_end и перекрёстно
сводим его последние crossfade секунд с отрезком оригинала
[loop_start − crossfade, loop_start]. Петля заканчивается ровно там, где
начинается, — шва не слышно. Затем loudnorm. Нужно loop_start ≥ crossfade.
"""

import os
import subprocess
import sys
import tempfile

SRC = "art/music"
OUT = "public/audio/music"

# id: (loop_start, loop_end, crossfade, target_lufs) — None для loop_start = без петли.
TRACKS = {
    # Оригинал 120 с: фраза заканчивается к ~107 с, дальше затухание.
    # Первые 3 с — затухающая вступительная нота, новая фраза с ~3,3 с.
    "music-menu": (3.0, 110.0, 3.0, -18),
    # Оригинал 120 с: 0,35 с тишины в начале, музыка до ~117 с, дальше затухание.
    # Фоновый трек — чуть тише меню, чтобы не мешать чтению.
    "music-investigation": (2.5, 118.5, 2.0, -20),
}


def run(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def prepare(track_id):
    loop_start, loop_end, xfade, lufs = TRACKS[track_id]
    src = os.path.join(SRC, track_id + ".mp3")
    dst = os.path.join(OUT, track_id + ".mp3")
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        full, body, head, mixed = (os.path.join(tmp, n) for n in ("full.wav", "a.wav", "b.wav", "m.wav"))
        run("-i", src, full)
        if loop_start is None:
            run("-i", full, "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=11", "-ar", "44100", mixed)
        else:
            run("-ss", str(loop_start), "-to", str(loop_end), "-i", full, body)
            if loop_start < xfade:
                raise SystemExit(f"{track_id}: loop_start must be >= crossfade")
            run("-ss", str(loop_start - xfade), "-t", str(xfade), "-i", full, head)
            run(
                "-i", body, "-i", head, "-filter_complex",
                f"[0:a][1:a]acrossfade=d={xfade}:c1=qsin:c2=qsin,loudnorm=I={lufs}:TP=-1.5:LRA=11",
                "-ar", "44100", mixed,
            )
        run("-i", mixed, "-codec:a", "libmp3lame", "-b:a", "128k", dst)
    print("ready:", dst)


if __name__ == "__main__":
    for tid in sys.argv[1:] or TRACKS:
        prepare(tid)
