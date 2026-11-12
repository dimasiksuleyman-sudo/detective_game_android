# Как запустить и собрать

_Актуальная инструкция для ветки `main`. Историю прежних веток этапов смотрите в [devlog](devlog/INDEX.md)._

## Требования

- **Node.js 24 LTS** (`.nvmrc`) и npm 11. Проверено на Node 24.22.1 / npm 11.9.0.
  - Минимум — Node 22.12. На Windows владельца работают Node 22.20.0 / npm 11.6.2.
- **Для APK:**
  - JDK 21;
  - Android SDK Platform 36, Build-Tools 35.0.0, Platform-Tools;
  - Gradle Wrapper 8.14.3 (скачается сам), AGP 8.13.0 задан в проекте.
- Команды выполняются из корня репозитория. Для классического режима ключ API не нужен.

## Git LFS (исходники арта и аудио)

Новые исходники в `art/` хранятся в Git LFS (ADR-027). Один раз на компьютере:

```bash
git lfs install
```

После этого `git pull` скачивает оригиналы сам. Если они не нужны (экономия трафика GitHub — 10 ГБ в месяц бесплатно), клонируйте так: `GIT_LFS_SKIP_SMUDGE=1 git clone ...`. Для игры оригиналы не нужны: всё готовое лежит в `public/`.

## Разработка в браузере

```bash
npm ci
npm run dev
```

Откройте http://localhost:5173. В браузере работает вся игра «Синяя сова», включая ИИ-допрос со своим ключом. Ключ в браузере хранится только в sessionStorage — это заглушка для разработки.

## Тесты

```bash
npm run lint
npm run typecheck
npm test
npm run case:validate
npm run build
npx playwright install chromium
npm run e2e
```

**Что проверяют тесты:**

- E2E собирает отдельный `dist-e2e` с MockAiClient, поднимает preview на порту 4173 и прогоняет сценарии на экранах 360×800 и 412×915. Реальный ИИ e2e не вызывает.
- Production-сборка проверяется отдельно: `npm run build && npm run verify:production`.
  - Не меняйте `webDir` на `dist-e2e` и не кладите эту сборку в APK.
- `npm run test:coverage` показывает покрытие кода тестами.

**Если e2e падают:**

- На чистой Linux-машине: `npx playwright install --with-deps chromium`.
- Ошибка `Executable doesn't exist`: установленный браузер не совпадает с версией `@playwright/test`. Выполните `npx playwright install chromium` ещё раз.

## Сборка APK

```bash
npm run android:debug
```

Скрипт собирает web, синхронизирует Capacitor и вызывает Gradle. Результат — `android/app/build/outputs/apk/debug/app-debug.apk`. Это debug-сборка, свой keystore для неё не нужен. Keystore никогда не кладите в git.

**Android SDK на Windows/macOS.** Удобнее всего через Android Studio:

1. В SDK Manager установите Platform 36, Build-Tools 35.0.0 и Platform-Tools.
2. В настройках Gradle выберите JDK 21.
3. Откройте в Android Studio папку `android/`.

**Android SDK на Linux** (только command-line tools):

```bash
export ANDROID_HOME="$PWD/work/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-36" "build-tools;35.0.0"
```

**Важно:**

- `android/local.properties` создаётся под вашу машину и в git не добавляется.
- `java -version` и `javac -version` должны показать JDK 21. Одного Java Runtime для сборки мало.
- Если Gradle ходит в сеть через прокси, задайте `systemProp.https.proxyHost/Port` (и `http.*`) в своём пользовательском `gradle.properties`. Пароли в репозиторий не кладите, TLS не отключайте.

**Сборка тестов Android:**

- `cd android && ./gradlew :app:assembleDebugAndroidTest` собирает тестовый APK без устройства.
- `./gradlew :app:connectedDebugAndroidTest` запускает тесты на подключённом телефоне.
- Пишите именно `:app:`. Без этого префикса задача собирает тестовые APK всех библиотек и упирается в известный конфликт сгенерированного Cordova-модуля.

## APK собирает только владелец

С 2026-11-12 (ADR-024) APK в облаке не собирается: CI проверяет только веб-часть (lint, типы, unit, валидатор, сборка, e2e), а агент сам APK тоже не собирает. Все сборки и будущая публикация — в Android Studio владельца по инструкции ниже. Старые CI-артефакты с APK (0.0.1–0.3.1) больше не используются.

## Обновить телефон на Windows (локальная сборка)

Выполните в PowerShell сверху вниз. Приглашение `PS ...>` и символы `>>` не копируйте.

```powershell
Set-Location 'D:\Projects\detective_game_android'
git fetch origin
git switch main
git pull --ff-only
npm.cmd ci
npm.cmd run android:sync
& "C:\Program Files\Android\Android Studio1\bin\studio64.exe" "D:\Projects\detective_game_android\android"
```

Затем в Android Studio:

1. Дождитесь Gradle Sync.
2. Выберите JDK 21 и подключённый TECNO.
3. Нажмите **Run**.

**Если что-то пошло не так:**

- Локальной ветки `main` ещё нет — Git создаст её из `origin`.
- Git пишет о локальных изменениях — не используйте `reset --hard`. Сохраните изменения отдельно и пришлите текст ошибки без секретов.
- Старые локальные ветки `codex/*` можно удалить: `git branch -D <имя>`. Всё их содержимое уже в `main`.
- После любых веб-изменений перед Run снова выполняйте `npm.cmd run android:sync`.

## Установка APK файлом

Обычно достаточно **Run** в Android Studio. Если нужен файл: после `npm.cmd run android:debug` или Build → Build APK(s) он лежит в `android/app/build/outputs/apk/debug/app-debug.apk`.

Можно установить и через USB (нужна отладка по USB):

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Если Android пишет `INSTALL_FAILED_UPDATE_INCOMPATIBLE`:** на телефоне стоит сборка с другим ключом подписи (например, старый APK из CI). Удалите старое приложение и установите заново.

Удаление стирает сохранённые партии и ключ. Ключ после этого введите заново. Сохранения v2 (с версии 0.3.0) старые версии приложения не открывают.

## ИИ-допрос со своим ключом

**Включить:**

1. На телефоне выключите режим полёта.
2. Откройте **Настройки → ИИ-допрос → Ключ aitunnel**.
3. Вставьте ключ и нажмите **«Проверить и сохранить ключ»**. Проверка запрашивает только баланс и ничего не генерирует.
4. Начните новую партию: **Новое дело → Синяя сова → Режим допроса: ИИ**. Старая классическая партия в ИИ-режим не переключается.

**Платный бенчмарк моделей** (до 60 запросов, по 20 на модель) запускается только вручную:

1. Задайте `AITUNNEL_API_KEY` в локальном окружении или в игнорируемом `.env.local`.
2. Выполните `npm run ai:smoke -- --allow-paid`.
3. Отчёт появится в `work/ai-benchmark/report.json`: маскированные ответы, стоимость, задержка, процент валидного JSON и прошедших guard.

Без ключа или без флага `--allow-paid` скрипт останавливается до первого запроса. Ключ не вставляйте в чат, команды, git и скриншоты.

## Арт: из PNG в WebP

Исходники лежат в `art/pilot/` (PNG) и в APK не попадают. Список входов, выходов и размеров — `art/pilot/manifest.json`.

После добавления или замены PNG:

```bash
npx tsx tools/build-pack.ts --art-only
npm run case:validate
```

Список всех 58 изображений и статусы — `art/ASSETS.md`; промпты новых 52 — `art/pilot/prompts.json`. Манифест включает также 36 портретов труппы. Скрипт ничего не генерирует и в сеть не ходит, он только конвертирует. Сборка ZIP-паков и публикация появятся на M5. На телефоне новые картинки появятся после `android:sync` → Run.

## Музыка и звуки

Подробно — `docs/AUDIO-PLAN.md`.

- Оригиналы музыки из ElevenLabs кладутся в `art/music/<id>.mp3`. В APK они не попадают.
- Готовые петли собираются командой `python3 tools/prepare-music.py [id]` (нужен ffmpeg) и попадают в `public/audio/music/`. Точки петли каждого трека задаются в `TRACKS` в скрипте.
- Звуки интерфейса пересобираются командой `python3 tools/generate-sfx.py` (нужны numpy и ffmpeg) в `public/audio/sfx/`. Сид фиксирован, поэтому результат повторяется до бита.

## Озвучка ElevenLabs (ADR-026)

Платно, одна попытка на файл. Нужен секрет `ELEVENLABS_API_KEY`: GitHub → Settings → Secrets and variables → Actions.

1. **Голоса (бесплатно):** Actions → «Озвучка ElevenLabs (вручную)» → Run workflow → `mode: voices`. В ветке `audio/elevenlabs-narration` появятся `docs/devlog/assets/narration-elevenlabs/voices.json` и `previews/*.mp3` — превью голосов.
2. **Пробы:** `mode: sample`, `voices` — до трёх `OWNER:VOICE` из `voices.json` через пробел. Одна фраза «Ветрогорск. Ночь с пятницы на субботу… проливной дождь» на каждый голос, файлы — `art/narration/elevenlabs/samples/`.
3. **Все дорожки:** `mode: all`, `narrator` и `chief` — ID выбранных голосов. MP3 и манифест — в `public/cases/<дело>/audio/`.

Проверить тексты без сети: `python3 tools/generate-narration-elevenlabs.py --list`. Если текст дела изменился, скрипт пометит дорожку «УСТАРЕЛО» и не будет её генерировать.

## Озвучка (Cartesia)

- Готовые 8 MP3 лежат в `public/cases/case-001-blue-owl/audio/` и входят в APK. Ни ключ, ни интернет для прослушивания не нужны.
- Фразы и правила — `docs/NARRATION-PLAN.md`.
- Ключ `CARTESIA_API_KEY` хранится только в GitHub → Settings → Secrets and variables → Actions. Не в Variables, не в исходниках, не в сообщениях.
- Локальный список фраз без сети:

  ```bash
  python3 tools/generate-narration.py --list
  ```

  Платная генерация запускается только с ключом в окружении и флагами `--sample --allow-paid` (одна проба) или `--all --allow-paid --voice ID` (полный набор).

- ⚠️ Workflow `.github/workflows/cartesia-sample.yml` запускается меткой на PR из удалённой ветки `codex/cartesia-narration`. Перед новой генерацией его нужно перенастроить на новую ветку.

**Где слушать в игре** (только по кнопке):

- брифинг → «Прослушать вступление»;
- хаб → «Прослушать подсказку Шефа», кнопка появляется только после открытия подсказки;
- финал → объяснение и три кадра реконструкции.

Звук останавливается, если уйти с экрана или свернуть приложение.

## Серверы

Раздача паков (сервер №1) и производство дел (сервер №2) появятся на M5. Уже работают: валидатор дела, production-проверка и ручной AI smoke.

## QA-интерфейс и S17 в Android Studio

APK собирает только владелец (ADR-024). Обычная production-подготовка: `npm.cmd run android:sync` (S17 исключён).

Для **debug с редактором S17**, из PowerShell в корне проекта:

```powershell
npm.cmd run typecheck
npx.cmd vite build --mode debug
npx.cmd cap sync android
```

Далее в Android Studio дождаться Sync и Run на телефоне. Debug-режим включает только инструменты разработчика; ИИ остаётся настоящим BYOK-клиентом, MockAiClient туда не входит. Перед release снова выполнить `npm.cmd run android:sync`, чтобы заменить debug-ресурсы production-ресурсами.

S17: Настройки → Редактор хотспотов → локация → тап → координаты/размер → «Скопировать JSON». Это подготовка правки case.json на ПК; сам файл на телефоне не изменяется.

E2E сохраняют снимки в `test-results/screens/` (игнорируется git); для отчёта агент отдельно копирует только выбранные снимки в `docs/devlog/assets/qa-pass/`.

## Звук и исходные документы (0.3.2)

Музыка/эффекты включены в `public/audio/`, сеть не нужна. Настройки — Настройки → Звук: Музыка и громкость, Звуки, Дождь. Они независимы от ручной озвучки Sergei. Браузер ждёт первого жеста; после перезагрузки это нормальное поведение, а не потеря настройки.

Для обновления в Windows: `git switch main`, `git pull --ff-only`, `npm.cmd ci`, `npm.cmd run android:sync`, затем Run в Android Studio. Для S17 по-прежнему используется подготовка `vite build --mode debug` из раздела выше. APK 0.3.2 / code 6 владелец собирает в Android Studio. CI APK не собирает вовсе, даже вручную (ADR-024).

Документы — исходные записи, выводы остаются во вкладке «Факты». Вопрос с afterBreak даёт правду только по уже раскрытому truthId текущего игрока. Старую историю реплик это не переписывает.
