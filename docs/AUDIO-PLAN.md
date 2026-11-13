# Музыка и звуки

Музыку пилота сгенерировал владелец в ElevenLabs Music. С 2026-11-12 музыку, эффекты и речь для новых дел может генерировать агент через ElevenLabs API — **одна попытка на файл** (ADR-025, `AGENTS.md` §7). Звуки интерфейса синтезированы кодом. Озвучка Sergei — отдельно, см. `NARRATION-PLAN.md`.

Всё работает офлайн и входит в APK. Музыку и звуки можно выключить в настройках, отдельно от озвучки (реализация — задача агента, ниже).

## Где что лежит

| Папка                        | Что                                                    | В APK |
| ---------------------------- | ------------------------------------------------------ | ----- |
| `art/music/`                 | оригиналы из ElevenLabs, как скачаны                   | нет   |
| `public/audio/music/`        | готовые петли: MP3 128 kbps, ≈ −18 LUFS, пик ≤ −1,5 dB | да    |
| `public/audio/sfx/`          | звуки интерфейса, MP3 128 kbps                         | да    |
| `public/audio/manifest.json` | список треков и звуков, роли, петли                    | да    |
| `tools/prepare-music.py`     | оригинал → бесшовная петля + громкость (ffmpeg)        | —     |
| `tools/generate-sfx.py`      | синтез звуков интерфейса (numpy + ffmpeg, фикс. сид)   | —     |

**Добавить новый трек:**

1. Загрузите оригинал в `art/music/<id>.mp3`. Имя — из таблицы ниже.
2. Агент подбирает точки петли и добавляет трек в `TRACKS` в `tools/prepare-music.py`.
3. Агент запускает `python3 tools/prepare-music.py <id>` и отмечает статус здесь.

## Музыка

| id                    | Где играет                          | Петля | Статус                                                |
| --------------------- | ----------------------------------- | ----- | ----------------------------------------------------- |
| `music-menu`          | главное меню, выбор дела, настройки | да    | ✅ готово: 1:47, петля 3,0→110,0 с, шов 3 с           |
| `music-investigation` | хаб, обыск, блокнот, доска          | да    | ✅ готово: 1:56, петля 2,5→118,5 с, шов 2 с, −20 LUFS |
| `music-interrogation` | допрос                              | да    | ✅ готово: 0:59, петля 1,0→60,0 с, шов 1 с, −20 LUFS  |
| `music-solved`        | финал «дело раскрыто»               | нет   | ✅ готово: 0:30, разовый, ≈ −18 LUFS                  |
| `music-unsolved`      | финал «дело не раскрыто»            | нет   | ✅ готово: 0:24, разовый, −20 LUFS (тихий по замыслу) |

`music-investigation`: оригинал 2:00 (просили 2:30), −19,9 LUFS, 0,35 с тишины в начале, музыка до ~117 с. Петля — с 2,5 с, хвост до 118,5 с сведён с отрезком 0,5–2,5 с; −20 LUFS (тише меню, под чтение).

`music-interrogation`: оригинал 1:00, начинается с удара и звучит до конца без затухания. Удар уходит в кроссфейд, петля — с 1-й секунды.

`music-solved`: оригинал 0:30, финальный аккорд затухает к ~29,5 с; обрезан на 29,6 с с коротким fade-out.

`music-unsolved`: оригинал 0:25, ~0,2 с тишины и медленное вступление; обрезан 0,2→24,6 с.

`music-menu`: оригинал 2:00, −15 LUFS. Фраза заканчивается к ~107 с, дальше затухание. Первые 3 с — затухающая вступительная нота. Петля начинается с новой фразы (3 с) и сводит хвост со вступлением.

### Промпты ElevenLabs Music

**music-investigation** — 2:30, петля

```text
Instrumental minimalist noir jazz background loop for investigating a crime scene. Around 65 BPM, A minor. Sparse upright bass pizzicato, soft brushed snare, occasional low vibraphone notes, quiet Rhodes, rain on windows ambience. Curious, thoughtful, slightly tense but calm; must stay in the background under dialogue and reading. No melody that grabs attention, no vocals, no drops, no ending. Seamless loop. 2 minutes 30 seconds.
```

**music-interrogation** — 1:00, петля

```text
Instrumental tense noir jazz underscore for a police interrogation scene. Around 75 BPM, E minor. Low pulsing upright bass ostinato, dry brushed hi-hat ticking like a clock, dissonant muted trumpet swells, dark piano clusters in the low register, subtle tape hiss. Suspicious, pressing, claustrophobic but restrained, quiet enough to sit under text. No vocals, no climax, no ending. Music starts on the very first beat with no silence. Seamless loop. 60 seconds.
```

**music-solved** — 0:30

```text
Instrumental noir jazz finale for solving a murder case. Around 80 BPM, starts in D minor and resolves to D major. Full but small jazz combo: muted trumpet melody, upright bass, brushed drums, piano. Bittersweet relief, justice served on a rainy night. Starts immediately with no silence, clear ending with a final held chord. No vocals. 30 seconds.
```

**music-unsolved** — 0:25

```text
Instrumental noir jazz ending for an unsolved murder case. Slow, around 60 BPM, B-flat minor. Lonely solo muted trumpet over sparse low piano and rain ambience, unresolved dissonant final chord fading into rain. Starts immediately with no silence. Sad, haunting, unfinished. No vocals. 25 seconds.
```

<details><summary>music-menu (уже сгенерирован)</summary>

```text
Instrumental noir jazz theme for a detective game main menu. Slow tempo around 70 BPM, D minor. Muted trumpet melody over walking upright bass, brushed drums, warm Rhodes electric piano chords, soft vinyl crackle and distant rain ambience. Smoky late-night jazz club mood, melancholic and mysterious, cinematic 1950s film noir feel. No vocals. Steady energy from start to end with no big ending, so it loops seamlessly. 2 minutes.
```

</details>

Длительность выставляйте минимальную (экономия кредитов) — и в тексте, и в настройке длины ElevenLabs: длину из текста сервис, похоже, игнорирует. Советы: делайте 2–3 варианта и берите тот, где начало и конец по настроению близки. Скачивайте MP3 или WAV. Перед публикацией игры сверьте условия коммерческого использования на своём тарифе ElevenLabs.

## Звуки интерфейса (синтез, одобрены владельцем 2026-11-12)

| Файл           | Когда звучит                                           | Длина |
| -------------- | ------------------------------------------------------ | ----- |
| `ui-tap`       | касание кнопки                                         | 0,1 с |
| `new-fact`     | новый факт или улика в блокноте: машинка и звонок      | 2,7 с |
| `handover`     | экран передачи телефона                                | 3,4 с |
| `hold-confirm` | удержание 1 с на экране передачи: тики и подтверждение | 2,2 с |
| `error`        | неверное обвинение, ошибка                             | 0,6 с |
| `rain-loop`    | фон дождя под музыкой, петля 12 с                      | 12 с  |
| `sting-break`  | подозреваемый сломался                                 | 6,4 с |
| `paper`        | открыть улику или документ                             | 0,5 с |

`hold-confirm` синхронизирован с удержанием 1 с: 10 тиков за 1,0 с, подтверждение на 1,02 с. Если удержание прервано, звук нужно остановить.

## Требования к плееру (задача агента)

- Модуль `src/audio/` (или `src/platform/audio.ts`) с веб-реализацией на `HTMLAudioElement` или Web Audio. Работает офлайн, файлы — из `public/audio/`.
- **Музыка по экранам:**
  - меню, выбор дела, настройки, «Как играть» → `music-menu`;
  - хаб, обыск, улика, блокнот, доска, обвинение → `music-investigation`;
  - допрос → `music-interrogation`;
  - финал → `music-solved` или `music-unsolved`.

  Смена трека — кроссфейд ~1,5 с. Пока трека нет в манифесте, играет ближайший готовый (сейчас — `music-menu`) или тишина. Приложение не падает.

- **Петля** без щелчка: на стыке кроссфейд или Web Audio `loop`.
- **Приглушение** музыки до ~25% во время озвучки Sergei и на время звука `sting-break`.
- **Сворачивание приложения** → пауза, возврат → продолжение. Экран передачи не раскрывает музыкой, кто на каком экране был: на передаче всегда одна и та же музыка.
- **Настройки** (отдельно от озвучки):
  - «Музыка» вкл/выкл и громкость;
  - «Звуки» вкл/выкл;
  - «Дождь» вкл/выкл.

  По умолчанию музыка включена на 40%, звуки включены. Настройки хранятся вместе с остальными, работают без перезапуска.

- **Автозапуск:** браузер разрешает звук только после первого касания — стартуем музыку с первого нажатия в меню.
- **Тесты:**
  - unit — выбор трека по экрану и настройки;
  - e2e — «Музыка выкл» останавливает оба музыкальных `<audio>`; эффекты, дождь и ручная озвучка управляются независимо (ADR-023);
  - MT на телефоне — громкость, петля, пауза в фоне, приглушение под озвучку.

## Подключённый плеер (0.3.2)

Платформенная реализация — `src/platform/soundscape.ts`, роли — `src/audio/policy.ts`, настройки — `src/store/audioSettingsStore.ts`. Все пять ролей подготовлены: menu, investigation, interrogation, solved и unsolved. Дождь по умолчанию выключен. Подробности — ADR-023, проверка на телефоне MT-018.

## Сейф (0.3.3, ADR-025)

Вращение каждого колёсика — один `ui-tap`; глобальный обработчик не дублирует щелчок внутри колёс. Первое успешное OPEN_LOCK играет `safe-open`, повторный просмотр молчит. Неверная попытка — `error`. Новый локальный MP3 `sfx/safe-open.mp3` внесён в манифест и воспроизводится через ту же платформенную обёртку/настройку «Звуки»/паузу жизненного цикла. Источник — детерминированный `tools/generate-safe-open.py` (без сетевого сервиса и ключа). Новая подсказка Шефа про дату пока текстовая; существующие восемь голосовых файлов не перегенерируются.
