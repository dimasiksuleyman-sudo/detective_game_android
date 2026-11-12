"""Исправляет заголовок уже полученного WAV; сеть/секреты не нужны."""
import hashlib
import importlib.util
import json
from pathlib import Path

folder = Path("work/cartesia")
spec = importlib.util.spec_from_file_location("narration", Path(__file__).with_name("generate-narration.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
for file in folder.glob("*.wav"):
    audio, seconds = module.normalize_wav(file.read_bytes())
    file.write_bytes(audio)
    report_file = file.with_suffix(".json")
    report = json.loads(report_file.read_text(encoding="utf-8"))
    report.update(seconds=seconds, sha256=hashlib.sha256(audio).hexdigest())
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(file.name, "seconds", round(seconds, 3), "bytes", len(audio))
