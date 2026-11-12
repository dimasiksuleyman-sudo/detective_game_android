# Как запустить и собрать

## Требования

- Node.js 24 LTS (`.nvmrc`), npm 11. Проверенная среда: Node 24.22.1, npm 11.9.0.
- Для APK: JDK 21, Android SDK platform 36, build-tools 35.0.0, platform-tools. Gradle 8.14.3 скачает Wrapper, AGP 8.13.0 задан в проекте.
- Выполнять команды из корня репозитория. Для классического режима ключ не нужен. Windows владельца: Node 22.20.0 / npm 11.6.2 подходят (минимум Node 22.12).

## Разработка в браузере

```bash
npm ci
npm run dev
```

Откройте http://localhost:5173. На текущей ветке codex/m2-ai-interrogation доступна классическая «Синяя сова»: новое дело, настройка игроков, обыск, допрос, блокнот, обвинение и финал. Изображения пока заглушки; шрифты включены локально.

## Тесты

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run e2e
```

E2E собирает отдельный `dist-e2e`, запускает preview на 4173 и проверяет сценарии при 360×800 и 412×915 с MockAiClient. Production проверяется отдельно командами `npm run build` и `npm run verify:production`. Новые скриншоты: `docs/devlog/assets/m2/`, исторические M1 сохранены в `assets/m1/`. На чистой Linux-машине для библиотек браузера используйте `npx playwright install --with-deps chromium`.

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

Для актуального M2 используйте ссылки ниже в разделе «Проверенная сборка M2» или локальную сборку Android Studio. Исторический M0: в GitHub откройте репозиторий → Actions → «Проверки и debug APK» → успешный запуск для ветки `codex/m0-project-scaffold` → Artifacts → `android-debug`. Скачайте ZIP и распакуйте `app-debug.apk`. Для скачивания артефактов нужен вход в GitHub. Проверенная сборка M0: [CI 43079709053](https://github.com/dimasiksuleyman-sudo/detective_game_android/actions/runs/43079709053), [ZIP android-debug](https://github.com/dimasiksuleyman-sudo/detective_game_android/actions/runs/43079709053/artifacts/13882664903), исходный код eaa7ab5. Внутри ZIP файл app-debug.apk. Если артефакт уже истёк, запустите workflow кнопкой Run workflow на нужной ветке.

После сборки скачать `app-debug.apk`, открыть на телефоне, разрешить установку из этого источника. Альтернатива через USB с включённой отладкой: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. Проверить MT-001 из MANUAL-TEST-QUEUE.md.

Если Android сообщает о конфликте подписи (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`), предыдущая debug-сборка была подписана другим debug-ключом. Для M0 удалите старое приложение и установите выбранный APK заново. Удаление стирает данные приложения; на этапах с сохранением партий сначала завершите нужную партию/сохраните предусмотренную игрой резервную копию. Это не относится к обычному обновлению правильно подписанной release-версии.

## Дополнительная сборка Android-теста

`cd android && ./gradlew :app:assembleDebugAndroidTest` компилирует instrumentation-APK приложения без устройства; этот шаг проверен. Реальный запуск: `./gradlew :app:connectedDebugAndroidTest` при подключённом телефоне, здесь не выполнялся. Не путайте с задачей без `:app:`: она собирает тестовые APK всех библиотек; известный конфликт зависимостей сгенерированного Cordova-модуля описан в STATUS.

## Серверы

Конфигурация раздачи паков и производственных скриптов появится на M5. Инструменты паков ещё не реализованы; валидатор дела, production-проверка и ручной AI smoke уже работают.

## Разработка M1

Ветка `codex/m1-classic-game` наследует принятый M0. На Windows после `git fetch origin` выполнить `git switch codex/m1-classic-game`, затем `npm.cmd ci` и `npm.cmd run android:sync`. В Android Studio открыть папку android и выбрать JDK 21. Установка зависимостей нужна после смены ветки.

Новые проверки: `npm run case:validate`, `npm run test:coverage`. Все игровые данные встроены в JS bundle; API-ключ не нужен. Для проверки сохранения выполните действие, вернитесь в меню и нажмите «Продолжить». Веб-оболочка не PWA: повторная загрузка страницы требует локально работающего dev/preview-сервера. На Android ассеты внутри APK.

## Когда CI выдаёт APK

По ADR-007 Android-сборка выполняется после изменений android/, npm-зависимостей или capacitor.config.ts. После правок только веб-кода/документов APK может отсутствовать: используйте последний подходящий артефакт либо Actions → workflow → Run workflow на нужной ветке для актуального APK. Ваш локальный цикл — npm.cmd run android:sync и Run в Android Studio. Веб-проверки CI остаются обязательными.

## Проверенная сборка M1

[CI 43094122435](https://github.com/dimasiksuleyman-sudo/detective_game_android/actions/runs/43094122435), [APK 0.1.0 ZIP](https://github.com/dimasiksuleyman-sudo/detective_game_android/actions/runs/43094122435/artifacts/13889094343), исходный код 9f45429. Для локальной сборки в Android Studio используйте текущую ветку M1 и npm.cmd run android:sync. Физическая проверка — MT-009 и MT-003.

В подтверждённой установке владельца Android Studio находится здесь: `C:\Program Files\Android\Android Studio1\bin\studio64.exe`. Открытие из PowerShell:

```powershell
& "C:\Program Files\Android\Android Studio1\bin\studio64.exe" "D:\Projects\detective_game_android\android"
```

## M2: разработка и ИИ

Ветка codex/m2-ai-interrogation. После переключения: npm.cmd ci → npm.cmd run android:sync → Gradle Sync и Run с JDK 21. Настройки → ввести свой ключ → «Проверить и сохранить ключ»; проверка запрашивает баланс без генерации. Новый режим ИИ доступен после сохранения проверенного ключа. Офлайн-вопросы не требуют ключа.

E2E собирает отдельный dist-e2e с mode=e2e и MockAiClient; production dist всегда отдельный. Не меняйте webDir на dist-e2e и не используйте эту сборку в APK.

Реальный бенчмарк не входит в npm test/e2e. Только вручную: задайте AITUNNEL_API_KEY в локальном защищённом окружении либо игнорируемом .env.local, затем `npm.cmd run ai:smoke -- --allow-paid`. Будет до 60 платных запросов (20 на модель); файл `work/ai-benchmark/report.json` содержит маскированные ответы, стоимость/задержку и проценты JSON/guard. Оценку живости заполните вручную. Отсутствие ключа/флага останавливает запуск до запросов. Ключ не копировать в чат, команды с его значением, git или скриншоты.

## Проверенная сборка M2 и обновление на Windows

[CI 43189010590](https://github.com/dimasiksuleyman-sudo/detective_game_android/actions/runs/43189010590) успешен для кода `4e23355`, включая [APK 0.2.0 / code 3 ZIP](https://github.com/dimasiksuleyman-sudo/detective_game_android/actions/runs/43189010590/artifacts/13929139414). PR: [№3](https://github.com/dimasiksuleyman-sudo/detective_game_android/pull/3). Изменения документов после этого кода не изменяют APK.

В PowerShell выполнить блок сверху вниз. Не копировать приглашение `PS ...>` или символы `>>`:

```powershell
Set-Location 'D:\Projects\detective_game_android'
git fetch origin
git switch codex/m2-ai-interrogation
git pull --ff-only
npm.cmd ci
npm.cmd run android:sync
& "C:\Program Files\Android\Android Studio1\bin\studio64.exe" "D:\Projects\detective_game_android\android"
```

При первом переключении Git создаст локальную ветку из origin, если её ещё нет. Если Git сообщает о локальных изменениях, сохранить их отдельно и прислать текст ошибки без секретов; не использовать reset --hard. В Android Studio дождаться Gradle Sync, выбрать JDK 21, подключённый TECNO и нажать Run. После будущих web-изменений снова выполнять android:sync перед Run.

На телефоне выключить режим полёта, открыть **Настройки → ИИ-допрос → Ключ aitunnel**. Вставить ключ, нажать **«Проверить и сохранить ключ»**. Появятся подтверждение и баланс, поле ввода очистится. Проверка использует метод баланса без генерации текста. Затем **Новое дело → Синяя сова → настройка игроков → Режим допроса: ИИ**. Создать новую партию, начать допрос и задать один свободный вопрос; генерация оплачивается с собственного баланса aitunnel. Старая классическая партия автоматически в ИИ не превращается.

Начать с одного вопроса, а не полного бенчмарка. Сообщить: удалось ли проверить ключ, модель, был ли ответ, отображённая стоимость и текст ошибки, если она есть. Ключ и скриншот заполненного поля не присылать. Полная проверка хранения/перезапуска/удаления/Logcat — MT-004/010; голос ещё не реализован.

## Подготовка арта

Ветка codex/pilot-art содержит документацию отдельной генерации изображений по ADR-011. Картинки выдаются в чате; установленная версия M2 остаётся с заглушками до отдельного подключения WebP и настройки хотспотов. Для текущей проверки ключа оставайтесь на codex/m2-ai-interrogation.

## Запланированный осмотр улик

ADR-012 принят: будущий осмотр деталей (статуэтка → самостоятельное обнаружение скола) без прямых подсказок; факт открывается после находки. В текущей игре доступен только осмотр зоны комнаты с выдачей улики; отдельного нажатия на скол пока нет. Команд для включения новой механики нет; MT-012 станет доступен после реализации.

## Текущая проверка владельцем

Ключ, баланс и реальный ответ уже подтверждены. Пустое поле сохранённого ключа и расширение квоты (ADR-013) включены в очередь будущего пакета правок; пока не реализованы. Новые инструкции владельцу выдаются по одному шагу с подтверждением.

В пакет UI-правок добавлен ADR-014: ИИ-форма выше, офлайн-вопросы ниже и свёрнуты по умолчанию. В текущей сборке порядок ещё прежний.

ADR-015: текущий постоянный блок ошибок временно оставлен по разрешению владельца; переход на тосты запланирован. Озвучка вступления (Cartesia.ai как кандидат) пока отсутствует, команд настройки и ключа этого сервиса не требуется.
