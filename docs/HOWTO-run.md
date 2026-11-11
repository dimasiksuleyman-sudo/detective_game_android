# Как запустить и собрать

## Требования

- Node.js 24 LTS (`.nvmrc`), npm 11. Проверенная среда: Node 24.22.1, npm 11.9.0.
- Для APK: JDK 21, Android SDK platform 36, build-tools 35.0.0, platform-tools. Gradle 8.14.3 скачает Wrapper, AGP 8.13.0 задан в проекте.
- Выполнять команды из корня репозитория. API-ключ для M0 не нужен.

## Разработка в браузере

```bash
npm ci
npm run dev
```

Откройте http://localhost:5173. Это каркас M0: ссылки ведут на 16 заглушек экранов. Настоящих игровых действий и сохранения пока нет. Шрифты включены локально.

## Тесты

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run e2e
```

E2E сам запускает preview на 4173, проверяет production-сборку при 360×800 и 412×915. Скриншоты: `docs/devlog/assets/m0/`. На чистой Linux-машине для библиотек браузера используйте `npx playwright install --with-deps chromium`.

## Подготовка Android SDK

Проще всего установить Android Studio, затем в SDK Manager выбрать Android SDK Platform 36, Android SDK Build-Tools 35.0.0 и Android SDK Platform-Tools. В настройках Gradle выбрать JDK 21. Открывать в Android Studio папку `android/`.

Для Linux/macOS с уже установленными официальными command-line tools (укажите собственный путь, не копируйте чужой):

```bash
export ANDROID_HOME="$PWD/work/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-36" "build-tools;35.0.0"
```

В облачной сессии SDK установлен в `/workspace/work/android-sdk`; путь записан только в игнорируемый `android/local.properties`. На вашей машине Android Studio создаст свой файл. `JAVA_HOME` должен указывать на JDK 21, `java -version` и `javac -version` подтверждают наличие runtime и компилятора. Одного Java Runtime для APK недостаточно. Не добавляйте local.properties в git.

В среде с HTTP-прокси Gradle нужны `systemProp.https.proxyHost`, `systemProp.https.proxyPort`, а также соответствующие `http`-параметры в пользовательском `gradle.properties`. Значения берите из настроек своей среды; не записывайте пароли в репозиторий и не отключайте TLS. Обычной домашней сети это не требуется.

## Сборка APK

```bash
npm run android:debug
```

Сценарий собирает web, синхронизирует Capacitor и вызывает Gradle. APK ожидается в `android/app/build/outputs/apk/debug/app-debug.apk`. Это debug, release-подпись не требуется; пользовательский keystore не нужен и не должен попадать в git.

## Установка на телефон

В GitHub откройте репозиторий → Actions → «Проверки и debug APK» → успешный запуск для ветки `codex/m0-project-scaffold` → Artifacts → `android-debug`. Скачайте ZIP и распакуйте `app-debug.apk`. Для скачивания артефактов нужен вход в GitHub. Номер запуска и ссылка будут указаны в итоговом devlog.

После сборки скачать `app-debug.apk`, открыть на телефоне, разрешить установку из этого источника. Альтернатива через USB с включённой отладкой: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. Проверить MT-001 из MANUAL-TEST-QUEUE.md.

## Серверы

Конфигурация раздачи паков и производственных скриптов появится на M5. Пустые файлы tools сейчас ничего не выполняют.
