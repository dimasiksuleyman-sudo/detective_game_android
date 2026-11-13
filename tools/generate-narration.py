"""Ручная подготовка TTS вне приложения. Секрет только в env, без повторов и автопубликации."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request
import wave

ROOT = Path(__file__).resolve().parent.parent
VERSION = "2026-08-14"
MODEL = "sonic-3.6"
MAX_AUDIO = 16 * 1024 * 1024


def phrases(case_id=None):
    plan = json.loads((ROOT / "content/narration/plan.json").read_text(encoding="utf-8"))
    if case_id and case_id != plan["caseId"]:
        plan = plan["cases"][case_id]
    case = json.loads((ROOT / "public/cases" / plan["caseId"] / "case.json").read_text(encoding="utf-8"))
    result = []
    for clip in plan["clips"]:
        text = case
        for field in clip["source"]:
            text = text[field]
        if not isinstance(text, str):
            raise ValueError("Источник фразы должен быть строкой")
        text = text.replace(clip.get("omit", "\0"), "")
        if clip.get("firstSentence"):
            text = text.split(". ", 1)[0].rstrip(".") + "."
        if not clip["id"].replace("-", "").isalnum():
            raise ValueError("Неверный id фразы")
        result.append({"id": clip["id"], "role": clip["role"], "text": text})
    return result


def request(endpoint, key, body=None, limit=MAX_AUDIO):
    headers = {"Authorization": "Bearer " + key, "Cartesia-Version": VERSION}
    payload = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request("https://api.cartesia.ai" + endpoint, data=payload, headers=headers)
    # Запрещаем redirect, чтобы заголовок авторизации не ушёл на другой хост.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    with urllib.request.build_opener(NoRedirect).open(req, timeout=60) as response:
        raw = response.read(limit + 1)
        if len(raw) > limit:
            raise ValueError("Ответ превышает ограничение размера")
        return raw


def normalize_wav(audio):
    # Потоковый WAV может объявлять размер data как 0xFFFFFFFF. Считаем реальные кадры.
    with wave.open(io.BytesIO(audio), "rb") as wav:
        channels, width, rate = wav.getnchannels(), wav.getsampwidth(), wav.getframerate()
        if channels not in (1, 2) or rate != 44100 or width != 2:
            raise ValueError("Некорректный формат WAV")
        frames = wav.readframes(MAX_AUDIO // (channels * width))
    if not frames or len(frames) % (channels * width):
        raise ValueError("Нет полных аудиокадров")
    out = io.BytesIO()
    with wave.open(out, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(width)
        wav.setframerate(rate)
        wav.writeframes(frames)
    return out.getvalue(), len(frames) / (rate * channels * width)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    command = parser.add_mutually_exclusive_group()
    command.add_argument("--list", action="store_true", help="Список текстов, без сети")
    command.add_argument("--voices", action="store_true", help="Список доступных русских голосов")
    command.add_argument("--sample", action="store_true", help="Только короткая первая фраза")
    command.add_argument("--all", action="store_true", help="Все фразы; отдельный платный запуск")
    parser.add_argument("--voice", help="ID голоса (не секрет)")
    parser.add_argument("--allow-paid", action="store_true")
    args = parser.parse_args()
    clips = phrases()
    if args.list or not (args.voices or args.sample or args.all):
        for clip in clips:
            print(f'{clip["id"]} [{clip["role"]}, {len(clip["text"])} знаков]: {clip["text"]}')
        return
    key = os.environ.get("CARTESIA_API_KEY", "").strip()
    if not key:
        print("Нужен CARTESIA_API_KEY в окружении. Запросов не было.", file=sys.stderr)
        sys.exit(2)
    if args.voices:
        data = json.loads(request("/voices?language=ru&limit=100", key, limit=2 * 1024 * 1024))
        rows = data.get("data", [])
        for row in rows:
            if row.get("language") == "ru":
                safe = {k: row.get(k) for k in ("id", "name", "gender", "language")}
                print(json.dumps(safe, ensure_ascii=False).replace(key, "[REDACTED]"))
        if data.get("has_more"):
            print("Доступны дополнительные страницы голосов; это не полный каталог.")
        return
    voice = args.voice or os.environ.get("CARTESIA_VOICE_ID", "")
    if not args.allow_paid:
        print("Нужен --allow-paid. Генерации не было.", file=sys.stderr)
        sys.exit(2)
    if not voice and args.sample:
        catalog = json.loads(request("/voices?language=ru&gender=masculine&is_owner=false&limit=100", key, limit=2 * 1024 * 1024))
        voices = [v for v in catalog.get("data", []) if v.get("status", "active") == "active"]
        if not voices:
            raise ValueError("Нет доступного русского мужского голоса")
        words = ("calm", "deep", "mature", "narrat", "спокой", "низк")
        voices.sort(key=lambda v: -sum(w in str(v.get("description", "")).lower() for w in words))
        chosen = voices[0]
        voice = chosen["id"]
        print(("Пробный голос: " + str(chosen.get("name", "")) + " / " + voice).replace(key, "[REDACTED]"))
    if not voice:
        print("Для полного набора нужен --voice или CARTESIA_VOICE_ID. Генерации не было.", file=sys.stderr)
        sys.exit(2)
    # id не секрет; ограничиваем формат и исключаем случайную передачу ключа как голоса.
    import re
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", voice):
        raise ValueError("Неверный формат ID голоса")
    selected = clips[:1] if args.sample else clips[1:]
    out = ROOT / "work/cartesia"
    out.mkdir(parents=True, exist_ok=True)
    for clip in selected:
        body = {"model_id": MODEL, "transcript": clip["text"], "voice": voice,
                "language": "ru", "output_format": {"container": "wav", "encoding": "pcm_s16le", "sample_rate": 44100}}
        digest = hashlib.sha256(json.dumps({"version": VERSION, "body": body}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        target = out / (clip["id"] + "-" + digest[:12] + ".wav")
        if target.exists():
            print(clip["id"] + ": готовый файл сохранён ранее, повтор не отправлен")
            continue
        audio = request("/tts/bytes", key, body)
        audio, duration = normalize_wav(audio)
        # Запись с x исключает случайную перезапись существующей пробы.
        with target.open("xb") as stream:
            stream.write(audio)
        report = {**clip, "model": MODEL, "voice": voice, "apiVersion": VERSION,
                  "seconds": duration, "sha256": hashlib.sha256(audio).hexdigest(), "cost": None}
        target.with_suffix(".json").write_text(json.dumps(report, ensure_ascii=False, indent=2).replace(key, "[REDACTED]"), encoding="utf-8")
        print(f'{clip["id"]}: WAV {duration:.1f} с, {len(audio)} байт; стоимость уточняется у провайдера')


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        print(f"Cartesia: HTTP {error.code}. Остановлено без повторов; тело ответа не выводится.", file=sys.stderr)
        sys.exit(1)
    except Exception:
        print("Не удалось подготовить аудио. Остановлено без повторов; секреты и детали ответа не выводятся.", file=sys.stderr)
        sys.exit(1)
