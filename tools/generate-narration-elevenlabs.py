"""Озвучка дела через ElevenLabs API (ADR-025, ADR-026). Одна попытка на каждый файл.

Режимы (запуск из корня репозитория):
  --list                 тексты и «произносимые» версии, без сети;
  --voices               русские мужские голоса из библиотеки + бесплатные превью (кредиты не тратятся);
  --sample --voice OWNER:VOICE [--voice ...] [--clip ID]   одна пробная фраза на каждый голос (до 3), платно;
  --all --narrator ID --chief ID               все дорожки дела, платно.

Платные режимы требуют --allow-paid и ELEVENLABS_API_KEY в окружении. Ключ не выводится и
не отправляется на другие хосты (превью скачиваются без ключа). Уже существующий файл
не генерируется повторно: перегенерация — только после явного решения владельца
(файл удаляется из art/narration/elevenlabs/ вручную).
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.elevenlabs.io"
CONFIG = json.loads((ROOT / "content/narration/elevenlabs.json").read_text(encoding="utf-8"))
ORIGINALS = ROOT / "art/narration/elevenlabs"
REPORTS = ROOT / "docs/devlog/assets/narration-elevenlabs"
MAX_AUDIO = 16 * 1024 * 1024

_spec = importlib.util.spec_from_file_location("narration", ROOT / "tools/generate-narration.py")
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)


def clips():
    """Тексты дела (как видит игрок) + произносимая версия с тегами ElevenLabs."""
    rows = []
    for clip in _module.phrases():
        speech = CONFIG["speech"].get(clip["id"])
        stale = speech is not None and speech["text"] != clip["text"]
        say = speech["say"] if speech and not stale else clip["text"]
        role = CONFIG["roles"][clip["role"]]
        # Жёсткое правило ранбука: цифры в речи запрещены (ElevenLabs путает падежи и формат времени).
        digits = speech is not None and not stale and re.search(r"\d", say) is not None
        rows.append({**clip, "say": say, "stale": stale, "digits": digits,
                     "input": role["direction"] + " " + say})
    return rows


class NoRedirect(urllib.request.HTTPRedirectHandler):
    # Без redirect: ключ не должен уйти на другой хост.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def call(method, path, key, body=None, limit=2 * 1024 * 1024):
    headers = {"xi-api-key": key, "Accept": "*/*"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    with urllib.request.build_opener(NoRedirect).open(req, timeout=120) as response:
        raw = response.read(limit + 1)
        if len(raw) > limit:
            raise ValueError("Ответ превышает ограничение размера")
        return raw, dict(response.headers)


def need_key():
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        print("Нужен ELEVENLABS_API_KEY в окружении. Запросов не было.", file=sys.stderr)
        sys.exit(2)
    return key


def tts(key, voice, clip):
    role = CONFIG["roles"][clip["role"]]
    body = {"text": clip["input"], "model_id": CONFIG["model"], "language_code": CONFIG["language"],
            "voice_settings": role["voiceSettings"]}
    query = urllib.parse.urlencode({"output_format": CONFIG["outputFormat"]})
    audio, headers = call("POST", f"/v1/text-to-speech/{voice}?{query}", key, body, MAX_AUDIO)
    if len(audio) < 1000:
        raise ValueError("Слишком короткий ответ вместо аудио")
    cost = headers.get("character-cost") or headers.get("Character-Cost")
    return audio, {"chars": len(clip["input"]), "characterCost": cost}


def seconds(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         check=True, capture_output=True, text=True).stdout.strip()
    return round(float(out), 2)


def write_once(target, audio):
    target.parent.mkdir(parents=True, exist_ok=True)
    # "xb": одна попытка — существующий файл никогда не перезаписывается.
    with target.open("xb") as stream:
        stream.write(audio)


def voice_id(value):
    if not re.fullmatch(r"[A-Za-z0-9]{10,40}", value):
        raise ValueError("Неверный формат ID голоса: " + value)
    return value


def owner_id(value):
    # public_owner_id в библиотеке — 64-символьный hex.
    if not re.fullmatch(r"[0-9a-f]{20,64}", value):
        raise ValueError("Неверный формат ID владельца голоса: " + value)
    return value


def cmd_voices(key):
    query = urllib.parse.urlencode({"language": "ru", "gender": "male", "page_size": 30,
                                    "sort": "usage_character_count_1y"})
    raw, _ = call("GET", "/v1/shared-voices?" + query, key)
    voices = json.loads(raw).get("voices", [])
    fields = ("voice_id", "public_owner_id", "name", "age", "accent", "descriptive", "use_case",
              "description", "usage_character_count_1y", "preview_url")
    rows = [{k: v.get(k) for k in fields} for v in voices]
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "voices.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    previews = REPORTS / "previews"
    previews.mkdir(exist_ok=True)
    for row in rows[:12]:
        url = row.get("preview_url") or ""
        if not url.startswith("https://"):
            continue
        # Превью — публичные файлы; скачиваем БЕЗ ключа.
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read(MAX_AUDIO)
        (previews / (row["voice_id"] + ".mp3")).write_bytes(data)
    print(f"Голосов: {len(rows)}; превью: {len(list(previews.glob('*.mp3')))} (бесплатно)")


def cmd_sample(key, pairs, clip_id="briefing-preview"):
    if not 1 <= len(pairs) <= 3:
        raise SystemExit("Нужно от 1 до 3 голосов --voice OWNER:VOICE")
    clip = next(c for c in clips() if c["id"] == clip_id)
    if clip["digits"] or clip["id"] not in CONFIG["speech"]:
        raise SystemExit(clip["id"] + ": в произносимом тексте цифры или его нет — перепишите словами")
    report = []
    for pair in pairs:
        owner, _, vid = pair.partition(":")
        vid = voice_id(vid or owner)
        target = ORIGINALS / "samples" / f"{vid}-{clip_id}.mp3"
        if target.exists():
            print(f"{vid}: проба уже есть, повтор не отправлен")
            continue
        if owner and vid != owner:
            # Добавляем голос из библиотеки в «Мои голоса» — без генерации и кредитов.
            raw, _ = call("POST", f"/v1/voices/add/{owner_id(owner)}/{vid}", key, {"new_name": "Noir " + vid[:6]})
            vid_used = json.loads(raw).get("voice_id", vid)
        else:
            vid_used = vid
        audio, cost = tts(key, vid_used, clip)
        write_once(target, audio)
        report.append({"voice": vid, "libraryVoice": vid_used, "file": str(target.relative_to(ROOT)),
                       "seconds": seconds(target), **cost})
        print(f"{vid}: проба {report[-1]['seconds']} с, {cost['chars']} знаков")
    REPORTS.mkdir(parents=True, exist_ok=True)
    path = REPORTS / "samples.json"
    old = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    path.write_text(json.dumps(old + report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cmd_all(key, narrator, chief):
    rows = [c for c in clips() if c["id"] != "briefing-preview"]
    stale = [c["id"] for c in rows if c["stale"] or c["id"] not in CONFIG["speech"]]
    if stale:
        raise SystemExit("Тексты дела изменились, обновите content/narration/elevenlabs.json: " + ", ".join(stale))
    digits = [c["id"] for c in rows if c["digits"]]
    if digits:
        raise SystemExit("В произносимом тексте цифры, перепишите словами: " + ", ".join(digits))
    voices = {"narrator": voice_id(narrator), "chief": voice_id(chief)}
    case_id = json.loads((ROOT / "content/narration/plan.json").read_text(encoding="utf-8"))["caseId"]
    folder = ORIGINALS / case_id
    report = []
    for clip in rows:
        target = folder / (clip["id"] + ".mp3")
        if target.exists():
            print(clip["id"] + ": уже сгенерировано, повтор не отправлен")
            continue
        audio, cost = tts(key, voices[clip["role"]], clip)
        write_once(target, audio)
        report.append({"id": clip["id"], **cost})
        print(f"{clip['id']}: {seconds(target)} с, {cost['chars']} знаков")
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "all.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    prepare(case_id, rows, voices)


def prepare(case_id, rows, voices):
    """Оригиналы → игровые MP3 (моно 64 kbps, −16 LUFS) + манифест. Манифест меняется только целиком."""
    folder = ORIGINALS / case_id
    missing = [c["id"] for c in rows if not (folder / (c["id"] + ".mp3")).exists()]
    if missing:
        print("Не все дорожки готовы, манифест не меняется: " + ", ".join(missing))
        return
    out = ROOT / "public/cases" / case_id / "audio"
    manifest = {"caseId": case_id, "provider": "ElevenLabs", "model": CONFIG["model"], "voices": voices, "clips": []}
    for clip in rows:
        target = out / (clip["id"] + ".mp3")
        subprocess.run(["ffmpeg", "-nostdin", "-y", "-i", str(folder / (clip["id"] + ".mp3")), "-map_metadata", "-1",
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ac", "1", "-ar", "44100",
                        "-codec:a", "libmp3lame", "-b:a", "64k", str(target)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        manifest["clips"].append({"id": clip["id"], "role": clip["role"], "text": clip["text"], "file": target.name,
                                  "seconds": seconds(target), "bytes": target.stat().st_size,
                                  "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                                  "model": CONFIG["model"]})
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Манифест обновлён:", len(manifest["clips"]), "дорожек")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--list", action="store_true")
    mode.add_argument("--voices", action="store_true")
    mode.add_argument("--sample", action="store_true")
    mode.add_argument("--all", action="store_true")
    parser.add_argument("--voice", action="append", default=[], help="OWNER:VOICE из voices.json или ID из «Моих голосов»")
    parser.add_argument("--clip", default="briefing-preview", help="Фраза для пробы (id из --list), например chief-hint-1")
    parser.add_argument("--narrator")
    parser.add_argument("--chief")
    parser.add_argument("--allow-paid", action="store_true")
    args = parser.parse_args()
    if args.list or not (args.voices or args.sample or args.all):
        for c in clips():
            flag = " [УСТАРЕЛО: текст дела изменился]" if c["stale"] else (" [ЦИФРЫ: перепишите словами]" if c["digits"] else "")
            print(f"{c['id']} [{c['role']}, {len(c['input'])} знаков]{flag}: {c['input']}")
        print("Всего знаков (без пробы):", sum(len(c["input"]) for c in clips() if c["id"] != "briefing-preview"))
        return
    key = need_key()
    if args.voices:
        return cmd_voices(key)
    if not args.allow_paid:
        raise SystemExit("Нужен --allow-paid. Генерации не было.")
    if args.sample:
        return cmd_sample(key, args.voice, args.clip)
    if not (args.narrator and args.chief):
        raise SystemExit("Нужны --narrator и --chief. Генерации не было.")
    return cmd_all(key, args.narrator, args.chief)


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        detail = error.read(400).decode("utf-8", "replace").replace(os.environ.get("ELEVENLABS_API_KEY", "\0"), "[REDACTED]")
        print(f"ElevenLabs: HTTP {error.code}. Остановлено без повторов. {detail}", file=sys.stderr)
        sys.exit(1)
