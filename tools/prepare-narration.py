"""Проверяет набор TTS, кодирует MP3 и создаёт манифест игровых аудиоресурсов. Без сети."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("narration", ROOT / "tools/generate-narration.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
source = ROOT / "work/cartesia"
out = ROOT / "public/cases/case-001-blue-owl/audio"
rows = []
for clip in module.phrases()[1:]:
    matches = []
    for report_path in source.glob(clip["id"] + "-*.json"):
        report = json.loads(report_path.read_text(encoding="utf-8"))
        wav = report_path.with_suffix(".wav")
        if (report.get("id") == clip["id"] and report.get("text") == clip["text"]
                and report.get("voice") == "1e4176b1-3db9-44d6-a601-4fe68b041942"
                and wav.exists()
                and hashlib.sha256(wav.read_bytes()).hexdigest() == report["sha256"]):
            matches.append((wav, report))
    if len(matches) != 1:
        raise ValueError("Нужна ровно одна актуальная дорожка: " + clip["id"])
    rows.append((clip, *matches[0]))
# До записи проверен весь набор, не подменяем фразы совпадением только имени файла.
out.mkdir(parents=True, exist_ok=True)
manifest = {"caseId": "case-001-blue-owl", "provider": "Cartesia", "voice": "Sergei",
            "voiceId": "1e4176b1-3db9-44d6-a601-4fe68b041942", "clips": []}
for clip, wav, report in rows:
    target = out / (clip["id"] + ".mp3")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-i", str(wav), "-map_metadata", "-1",
                    "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "64k", str(target)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    manifest["clips"].append({**clip, "file": target.name, "seconds": report["seconds"],
                              "bytes": target.stat().st_size,
                              "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                              "model": report["model"], "apiVersion": report["apiVersion"]})
(out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Подготовлено MP3:", len(manifest["clips"]), "байт:", sum(c["bytes"] for c in manifest["clips"]))
