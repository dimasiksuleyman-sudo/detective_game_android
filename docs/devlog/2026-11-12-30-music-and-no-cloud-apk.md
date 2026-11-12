# 2026-11-12-30 — Вся музыка готова, APK только у владельца

**Этап:** M3/M4 (аудио) и процесс · **Ветка:** `claude/lucid-wozniak-3iu7wi` от `main` (`8d04350`) · **ADR:** 024

## Цель

Подготовить три трека, которые владелец загрузил в `art/music/`. По просьбе владельца убрать сборку APK из облака: он собирает и публикует сам через Android Studio.

## Что сделано

- `tools/prepare-music.py` переписан на словари параметров. Петли (`loop`) и разовые треки (`once`: обрезка тишины, короткие fade). Петли меню и расследования пересобраны побитно (по PCM) одинаково.
- **music-interrogation**: оригинал 1:00, начинается с удара и звучит до конца. Петля 1,0→60,0 с, шов 1 с; громкость на шве −20,1 → −20,8 dB. Итог 0:59, −20 LUFS, 0,95 МБ.
- **music-solved**: оригинал 0:30, обрезан на 29,6 с, fade-out 0,4 с. Итог −19 LUFS, 0,47 МБ.
- **music-unsolved**: оригинал 0:25, срезано 0,2 с тишины в начале, fade-out 0,4 с. Итог −21,6 LUFS (тихий по замыслу), 0,39 МБ.
- `public/audio/manifest.json`: все 5 треков готовы, `planned` пуст. У финалов поле `when: solved|unsolved`.
- `docs/AUDIO-PLAN.md`: статусы, параметры петель, промпты с минимальной длиной (60/30/25 с).
- CI: убраны JDK, Android SDK, `cap sync`, Gradle и артефакт `android-debug`. Workflow «Проверки» оставляет lint, типы, unit, валидатор, build, production-проверку и e2e (ADR-024, заменяет ADR-007).
- `AGENTS.md`: агент APK не собирает; перед закрытием этапа — build и `cap sync`. HOWTO, roadmap, testing, STATUS приведены в соответствие.

## Изменённые файлы

- `art/music/*` — оригиналы владельца, не изменены.
- `public/audio/music/music-{interrogation,solved,unsolved}.mp3` — готовые треки.
- `tools/prepare-music.py`, `public/audio/manifest.json`, `docs/AUDIO-PLAN.md` — аудио.
- `.github/workflows/ci.yml`, `docs/decisions/024-no-cloud-apk.md`, `docs/decisions/007-apk-build-frequency.md` (статус) — CI.
- `AGENTS.md`, `docs/HOWTO-run.md`, `docs/06-roadmap.md`, `docs/07-testing.md`, `docs/STATUS.md`, `docs/devlog/INDEX.md`, эта запись.

## Команды

`python3 tools/prepare-music.py` (сверка PCM старых петель), ffmpeg `ebur128`/`volumedetect` для краёв и шва, `npm run lint`, `typecheck`, `test`, `case:validate`.

## Проблемы и решения

- У `music-interrogation` в начале удар. Он попадает в кроссфейд и звучит мягче при каждом повторе. Альтернатива — резкий стык с ударом в начале — не совпала бы с долей: 60 с при 75 BPM не равны целому числу тактов.

## Отклонения от плана

Нет. ADR-024 — по прямому указанию владельца.

## Ручная проверка

Нет, пока плеер не подключён. Плеер делает агент по AUDIO-PLAN.

## Следующий шаг

Плеер агента (PR #13) уже выбирает треки из манифеста по экранам и финалу — три новых трека подхватываются без кода. Новых треков не требуется.
