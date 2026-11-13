# 2026-11-13-01 — Полная озвучка ElevenLabs

**Этап:** M3/аудио · **Ветка:** `claude/lucid-wozniak-3iu7wi` от `main` (`d720c14`, после сейфа) · **ADR:** 026

## Цель

После слияния сейфа (PR #20) сгенерировать полный набор озвучки утверждёнными голосами по актуальным текстам.

## Что сделано

- Проверено `--list`: устаревших текстов и цифр в произносимом тексте нет. Агент добавил `chief-hint-4` («У покойного коды — всегда памятные даты. Когда открылась „Сова“?»).
- Сгенерировано **9 дорожек по одной попытке**, рассказчик Alex Bell (`TUQNWEvVPBLzMBSVDPUA`), Шеф Nester Surovy (`pM78bgjPVk0JXtaEnFoj`), `eleven_v4`:
  - брифинг — 35,9 с;
  - подсказки Шефа: 4,7 / 5,7 / 5,5 / 5,7 с;
  - подписи реконструкции: 2,6 / 4,7 / 3,3 с;
  - объяснение — 42,2 с.
- **Расход:** 2128 знаков → **852 кредита** (по заголовку `character-cost`).
- Игровые MP3 — моно 64 kbps, громкость −15,7…−18,4 LUFS, пик ≤ −0,9 dBFS. Манифест: `provider: ElevenLabs`, голоса по ролям.
- Оригиналы — в Git LFS: `art/narration/elevenlabs/case-001-blue-owl/`.
- `src/content/narration.test.ts`: вместо «8 дорожек, у подсказки про сейф озвучки нет» — «9 дорожек, каждая подсказка Шефа озвучена». Проверка хешей и совпадения текстов с каноном осталась прежней.

## Изменённые файлы

- `public/cases/case-001-blue-owl/audio/*.mp3`, `manifest.json` — новая озвучка.
- `art/narration/elevenlabs/case-001-blue-owl/*.mp3` (LFS), `docs/devlog/assets/narration-elevenlabs/all.json` — оригиналы и отчёт.
- `src/content/narration.test.ts` — 9 дорожек.
- `docs/STATUS.md`, `docs/NARRATION-PLAN.md`, `docs/MANUAL-TEST-QUEUE.md` (MT-020), `docs/devlog/INDEX.md`, эта запись.

## Команды

`generate-narration-elevenlabs.py --list` и `--all --allow-paid`, ebur128, lint, typecheck, 100 unit, 86 e2e, `lfs:check`.

## Отклонения от плана

Нет.

## Ручная проверка

MT-020: прослушать на телефоне, отметить ударения и неудачные места. Перегенерация — только по решению владельца.

## Следующий шаг

Ответ владельца по MT-020. Затем — второе дело по ранбуку в новом чате.
