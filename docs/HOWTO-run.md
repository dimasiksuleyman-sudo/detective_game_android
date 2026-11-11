# Как запустить и собрать

## Требования

- Node.js 24 LTS (`.nvmrc`), npm 11. Проверенная среда: Node 24.22.1, npm 11.9.0.
- Для APK: JDK 21 и Android SDK; точные пакеты SDK и результаты будут добавлены после сборки.
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

## Сборка APK

```bash
npm run android:debug
```

Сценарий собирает web, синхронизирует Capacitor и вызывает Gradle. APK ожидается в `android/app/build/outputs/apk/debug/app-debug.apk`. Это debug, release-подпись не требуется; пользовательский keystore не нужен и не должен попадать в git.

## Установка на телефон

После сборки скачать `app-debug.apk`, открыть на телефоне, разрешить установку из этого источника. Альтернатива через USB с включённой отладкой: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. Проверить MT-001 из MANUAL-TEST-QUEUE.md.

## Серверы

Конфигурация раздачи паков и производственных скриптов появится на M5. Пустые файлы tools сейчас ничего не выполняют.
