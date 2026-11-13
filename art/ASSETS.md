# Ассеты «Синей совы» и труппы

Источник: [арт-библия](../docs/05-art-bible.md), ADR-020. В M3 заменены **52 заглушки** и сохранены 6 прежних ресурсов; для головоломки сейфа добавлены ещё 5 картинок. Статус «одобрено» ставится только после явного подтверждения владельца; генерация не ждёт такого подтверждения.

Всего: **63**. Заглушек: **0**. Сгенерировано: **63**. Одобрено: **0**.

Для каждой новой картинки точный английский промпт и референсы хранятся в [pilot/prompts.json](pilot/prompts.json), ключ указан в таблице. Каждый промпт включает STYLE_CORE. Портреты: neutral — выбранный мастер, остальные эмоции — правки этого мастера. Размер в таблице — игровой WebP; выбранные оригиналы PNG в art/pilot/.

| Игровой файл                       | Тип                  | Размер    | Оригинал PNG                                                 | Промпт / ключ             | Статус        |
| ---------------------------------- | -------------------- | --------- | ------------------------------------------------------------ | ------------------------- | ------------- |
| `images/cover.webp`                | готовый исходный арт | 720×1080  | [pilot/cover.png](pilot/cover.png)                           | `docs/05-art-bible.md §5` | сгенерировано |
| `images/locations/l-hall.webp`     | готовый исходный арт | 1080×1620 | [pilot/l-hall.png](pilot/l-hall.png)                         | `docs/05-art-bible.md §5` | сгенерировано |
| `images/locations/l-office.webp`   | готовый исходный арт | 1080×1620 | [pilot/l-office.png](pilot/l-office.png)                     | `docs/05-art-bible.md §5` | сгенерировано |
| `images/locations/l-alley.webp`    | готовый исходный арт | 1080×1620 | [pilot/l-alley.png](pilot/l-alley.png)                       | `docs/05-art-bible.md §5` | сгенерировано |
| `images/closeups/h-floor.webp`     | готовый исходный арт | 1024×1024 | [pilot/statuette-closeup.png](pilot/statuette-closeup.png)   | `docs/05-art-bible.md §5` | сгенерировано |
| `images/clues/c-statuette.webp`    | готовый исходный арт | 512×512   | [pilot/statuette-item.png](pilot/statuette-item.png)         | `docs/05-art-bible.md §5` | сгенерировано |
| `images/closeups/h-photos.webp`    | closeups             | 1024×1024 | [pilot/h-photos.png](pilot/h-photos.png)                     | `h-photos`                | сгенерировано |
| `images/closeups/h-board.webp`     | closeups             | 1024×1024 | [pilot/h-board.png](pilot/h-board.png)                       | `h-board`                 | сгенерировано |
| `images/closeups/h-counter.webp`   | closeups             | 1024×1024 | [pilot/h-counter.png](pilot/h-counter.png)                   | `h-counter`               | сгенерировано |
| `images/closeups/h-desk.webp`      | closeups             | 1024×1024 | [pilot/h-desk.png](pilot/h-desk.png)                         | `h-desk`                  | сгенерировано |
| `images/closeups/h-safe.webp`      | closeups             | 1024×1024 | [pilot/h-safe.png](pilot/h-safe.png)                         | `h-safe`                  | сгенерировано |
| `images/closeups/h-sofa.webp`      | closeups             | 1024×1024 | [pilot/h-sofa.png](pilot/h-sofa.png)                         | `h-sofa`                  | сгенерировано |
| `images/closeups/h-door.webp`      | closeups             | 1024×1024 | [pilot/h-door.png](pilot/h-door.png)                         | `h-door`                  | сгенерировано |
| `images/closeups/h-dumpster.webp`  | closeups             | 1024×1024 | [pilot/h-dumpster.png](pilot/h-dumpster.png)                 | `h-dumpster`              | сгенерировано |
| `images/closeups/h-puddle.webp`    | closeups             | 1024×1024 | [pilot/h-puddle.png](pilot/h-puddle.png)                     | `h-puddle`                | сгенерировано |
| `images/clues/c-diary.webp`        | clues                | 512×512   | [pilot/c-diary.png](pilot/c-diary.png)                       | `c-diary`                 | сгенерировано |
| `images/clues/c-ledger.webp`       | clues                | 512×512   | [pilot/c-ledger.png](pilot/c-ledger.png)                     | `c-ledger`                | сгенерировано |
| `images/clues/c-photo.webp`        | clues                | 512×512   | [pilot/c-photo.png](pilot/c-photo.png)                       | `c-photo`                 | сгенерировано |
| `images/clues/c-whisky-crate.webp` | clues                | 512×512   | [pilot/c-whisky-crate.png](pilot/c-whisky-crate.png)         | `c-whisky-crate`          | сгенерировано |
| `troupe/a01-arkady/neutral.webp`   | portrait             | 768×1152  | [pilot/a01-arkady-neutral.png](pilot/a01-arkady-neutral.png) | `a01-arkady-neutral`      | сгенерировано |
| `troupe/a01-arkady/nervous.webp`   | portrait             | 768×1152  | [pilot/a01-arkady-nervous.png](pilot/a01-arkady-nervous.png) | `a01-arkady-nervous`      | сгенерировано |
| `troupe/a01-arkady/angry.webp`     | portrait             | 768×1152  | [pilot/a01-arkady-angry.png](pilot/a01-arkady-angry.png)     | `a01-arkady-angry`        | сгенерировано |
| `troupe/a01-arkady/sad.webp`       | portrait             | 768×1152  | [pilot/a01-arkady-sad.png](pilot/a01-arkady-sad.png)         | `a01-arkady-sad`          | сгенерировано |
| `troupe/a01-arkady/smug.webp`      | portrait             | 768×1152  | [pilot/a01-arkady-smug.png](pilot/a01-arkady-smug.png)       | `a01-arkady-smug`         | сгенерировано |
| `troupe/a01-arkady/broken.webp`    | portrait             | 768×1152  | [pilot/a01-arkady-broken.png](pilot/a01-arkady-broken.png)   | `a01-arkady-broken`       | сгенерировано |
| `troupe/a02-gleb/neutral.webp`     | portrait             | 768×1152  | [pilot/a02-gleb-neutral.png](pilot/a02-gleb-neutral.png)     | `a02-gleb-neutral`        | сгенерировано |
| `troupe/a02-gleb/nervous.webp`     | portrait             | 768×1152  | [pilot/a02-gleb-nervous.png](pilot/a02-gleb-nervous.png)     | `a02-gleb-nervous`        | сгенерировано |
| `troupe/a02-gleb/angry.webp`       | portrait             | 768×1152  | [pilot/a02-gleb-angry.png](pilot/a02-gleb-angry.png)         | `a02-gleb-angry`          | сгенерировано |
| `troupe/a02-gleb/sad.webp`         | portrait             | 768×1152  | [pilot/a02-gleb-sad.png](pilot/a02-gleb-sad.png)             | `a02-gleb-sad`            | сгенерировано |
| `troupe/a02-gleb/smug.webp`        | portrait             | 768×1152  | [pilot/a02-gleb-smug.png](pilot/a02-gleb-smug.png)           | `a02-gleb-smug`           | сгенерировано |
| `troupe/a02-gleb/broken.webp`      | portrait             | 768×1152  | [pilot/a02-gleb-broken.png](pilot/a02-gleb-broken.png)       | `a02-gleb-broken`         | сгенерировано |
| `troupe/a03-vera/neutral.webp`     | portrait             | 768×1152  | [pilot/a03-vera-neutral.png](pilot/a03-vera-neutral.png)     | `a03-vera-neutral`        | сгенерировано |
| `troupe/a03-vera/nervous.webp`     | portrait             | 768×1152  | [pilot/a03-vera-nervous.png](pilot/a03-vera-nervous.png)     | `a03-vera-nervous`        | сгенерировано |
| `troupe/a03-vera/angry.webp`       | portrait             | 768×1152  | [pilot/a03-vera-angry.png](pilot/a03-vera-angry.png)         | `a03-vera-angry`          | сгенерировано |
| `troupe/a03-vera/sad.webp`         | portrait             | 768×1152  | [pilot/a03-vera-sad.png](pilot/a03-vera-sad.png)             | `a03-vera-sad`            | сгенерировано |
| `troupe/a03-vera/smug.webp`        | portrait             | 768×1152  | [pilot/a03-vera-smug.png](pilot/a03-vera-smug.png)           | `a03-vera-smug`           | сгенерировано |
| `troupe/a03-vera/broken.webp`      | portrait             | 768×1152  | [pilot/a03-vera-broken.png](pilot/a03-vera-broken.png)       | `a03-vera-broken`         | сгенерировано |
| `troupe/a04-timur/neutral.webp`    | portrait             | 768×1152  | [pilot/a04-timur-neutral.png](pilot/a04-timur-neutral.png)   | `a04-timur-neutral`       | сгенерировано |
| `troupe/a04-timur/nervous.webp`    | portrait             | 768×1152  | [pilot/a04-timur-nervous.png](pilot/a04-timur-nervous.png)   | `a04-timur-nervous`       | сгенерировано |
| `troupe/a04-timur/angry.webp`      | portrait             | 768×1152  | [pilot/a04-timur-angry.png](pilot/a04-timur-angry.png)       | `a04-timur-angry`         | сгенерировано |
| `troupe/a04-timur/sad.webp`        | portrait             | 768×1152  | [pilot/a04-timur-sad.png](pilot/a04-timur-sad.png)           | `a04-timur-sad`           | сгенерировано |
| `troupe/a04-timur/smug.webp`       | portrait             | 768×1152  | [pilot/a04-timur-smug.png](pilot/a04-timur-smug.png)         | `a04-timur-smug`          | сгенерировано |
| `troupe/a04-timur/broken.webp`     | portrait             | 768×1152  | [pilot/a04-timur-broken.png](pilot/a04-timur-broken.png)     | `a04-timur-broken`        | сгенерировано |
| `troupe/a05-olga/neutral.webp`     | portrait             | 768×1152  | [pilot/a05-olga-neutral.png](pilot/a05-olga-neutral.png)     | `a05-olga-neutral`        | сгенерировано |
| `troupe/a05-olga/nervous.webp`     | portrait             | 768×1152  | [pilot/a05-olga-nervous.png](pilot/a05-olga-nervous.png)     | `a05-olga-nervous`        | сгенерировано |
| `troupe/a05-olga/angry.webp`       | portrait             | 768×1152  | [pilot/a05-olga-angry.png](pilot/a05-olga-angry.png)         | `a05-olga-angry`          | сгенерировано |
| `troupe/a05-olga/sad.webp`         | portrait             | 768×1152  | [pilot/a05-olga-sad.png](pilot/a05-olga-sad.png)             | `a05-olga-sad`            | сгенерировано |
| `troupe/a05-olga/smug.webp`        | portrait             | 768×1152  | [pilot/a05-olga-smug.png](pilot/a05-olga-smug.png)           | `a05-olga-smug`           | сгенерировано |
| `troupe/a05-olga/broken.webp`      | portrait             | 768×1152  | [pilot/a05-olga-broken.png](pilot/a05-olga-broken.png)       | `a05-olga-broken`         | сгенерировано |
| `troupe/a16-chief/neutral.webp`    | portrait             | 768×1152  | [pilot/a16-chief-neutral.png](pilot/a16-chief-neutral.png)   | `a16-chief-neutral`       | сгенерировано |
| `troupe/a16-chief/nervous.webp`    | portrait             | 768×1152  | [pilot/a16-chief-nervous.png](pilot/a16-chief-nervous.png)   | `a16-chief-nervous`       | сгенерировано |
| `troupe/a16-chief/angry.webp`      | portrait             | 768×1152  | [pilot/a16-chief-angry.png](pilot/a16-chief-angry.png)       | `a16-chief-angry`         | сгенерировано |
| `troupe/a16-chief/sad.webp`        | portrait             | 768×1152  | [pilot/a16-chief-sad.png](pilot/a16-chief-sad.png)           | `a16-chief-sad`           | сгенерировано |
| `troupe/a16-chief/smug.webp`       | portrait             | 768×1152  | [pilot/a16-chief-smug.png](pilot/a16-chief-smug.png)         | `a16-chief-smug`          | сгенерировано |
| `troupe/a16-chief/broken.webp`     | portrait             | 768×1152  | [pilot/a16-chief-broken.png](pilot/a16-chief-broken.png)     | `a16-chief-broken`        | сгенерировано |
| `images/reconstruction/1.webp`     | reconstruction       | 1200×800  | [pilot/reconstruction-1.png](pilot/reconstruction-1.png)     | `reconstruction-1`        | сгенерировано |
| `images/reconstruction/2.webp`     | reconstruction       | 1200×800  | [pilot/reconstruction-2.png](pilot/reconstruction-2.png)     | `reconstruction-2`        | сгенерировано |
| `images/reconstruction/3.webp`     | reconstruction       | 1200×800  | [pilot/reconstruction-3.png](pilot/reconstruction-3.png)     | `reconstruction-3`        | сгенерировано |

Контакт-листы новых пачек: docs/devlog/assets/m3-art/. Проверка на телефоне не блокирует работу. S17, UI-фоны/иконка и финальный стиль экранов — следующий PR, не часть этих 52 ассетов.

## Головоломка сейфа (ADR-024)

Промпты новых ресурсов — [pilot/safe-prompts.json](pilot/safe-prompts.json). Разворот добавлен для самостоятельного осмотра подписи, текст поверх бумаги выводит код.

| Игровой файл                           | Тип      | Размер    | PNG                         | Промпт            | Статус        |
| -------------------------------------- | -------- | --------- | --------------------------- | ----------------- | ------------- |
| `images/closeups/h-safe-open.webp`     | closeups | 1024×1024 | `pilot/h-safe-open.png`     | `h-safe-open`     | сгенерировано |
| `images/closeups/h-ledger-spread.webp` | closeups | 1024×1024 | `pilot/h-ledger-spread.png` | `h-ledger-spread` | сгенерировано |
| `images/clues/c-envelope.webp`         | clues    | 512×512   | `pilot/c-envelope.png`      | `c-envelope`      | сгенерировано |
| `images/clues/c-will.webp`             | clues    | 512×512   | `pilot/c-will.png`          | `c-will`          | сгенерировано |
| `images/clues/c-lawyer-card.webp`      | clues    | 512×512   | `pilot/c-lawyer-card.png`   | `c-lawyer-card`   | сгенерировано |

## Приложение — иконка и сплэш

**8 ресурсов, 0 заглушек, 8 сгенерировано, 0 одобрено.** Исходники PNG в Git LFS. Цвета и исходный промпт — art-bible STYLE_CORE + §4.6; параметры генерации/подготовки — art/app/generation.json. Размеры Android генерируются, вручную PNG по папкам не правятся.

| Файл                           | Тип / размер           | Промпт / подготовка                                                            | Статус        |
| ------------------------------ | ---------------------- | ------------------------------------------------------------------------------ | ------------- |
| art/app/app-icon.png           | мастер 1024×1024       | Лупа с отражением одной оранжевой настольной лампы; art-bible §4.6             | сгенерировано |
| art/app/icon-foreground.png    | слой 1024×1024, alpha  | Правка мастера, прозрачный фон; безопасный круг 590 px                         | сгенерировано |
| art/app/icon-background.png    | фон 1024×1024          | Однотонный #1E2A33, техническая заливка                                        | сгенерировано |
| art/app/icon-monochrome.png    | маска 1024×1024, alpha | Правка по переднему слою: белое кольцо лупы и ручка, прозрачный центр          | сгенерировано |
| art/app/splash.png             | сплэш 2732×2732        | Центральный foreground на #12181D, мотив меньше 25% ширины                     | сгенерировано |
| art/app/splash-dark.png        | сплэш 2732×2732        | Тот же композит для тёмной темы                                                | сгенерировано |
| art/store/icon-512.png         | магазин 512×512, RGBA  | Мастер без прозрачности и собственных скруглений                               | сгенерировано |
| art/store/feature-1024x500.png | магазин 1024×500       | STYLE_CORE: пустой джаз-бар, дождь за окном, лампа и сова в центре, без текста | сгенерировано |

Контакт-лист: [три маски, три размера, два фона](../docs/devlog/assets/app-icon/contact-sheet.jpg). Графика магазина не включается в APK.

## Дело № 2 — «Номер семь»

Полный план до генерации: **68 оригиналов**. Источник канона — `docs/cases/case-002-room-seven.md`. Точные STYLE_CORE-промпты и референсы: [case-002-room-seven/prompts.json](case-002-room-seven/prompts.json). Порядок: локации → крупные планы → предметы/портфель/детали → портреты (neutral → отдельные правки эмоций) → реконструкция и обложка. Текста на картинках нет. Надежда в сером кардигане, нитка серая; кресло пустое, только сползший плед. Оригиналы PNG — Git LFS. Музыка общая, голос не генерируется.

| Игровой файл                                  | Тип            | Размер    | Оригинал PNG                                          | Промпт / ключ            | Статус                                                 |
| --------------------------------------------- | -------------- | --------- | ----------------------------------------------------- | ------------------------ | ------------------------------------------------------ |
| `images/locations/l-lobby.webp`               | location       | 1080×1620 | [PNG](case-002-room-seven/l-lobby.png)                | `l-lobby`                | сгенерировано                                          |
| `images/locations/l-room7.webp`               | location       | 1080×1620 | [PNG](case-002-room-seven/l-room7.png)                | `l-room7`                | сгенерировано (v3, без цепочки, одобрено владельцем)   |
| `images/locations/l-corridor.webp`            | location       | 1080×1620 | [PNG](case-002-room-seven/l-corridor.png)             | `l-corridor`             | сгенерировано                                          |
| `images/closeups/h-register.webp`             | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-register.png)             | `h-register`             | сгенерировано                                          |
| `images/closeups/h-phone.webp`                | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-phone.png)                | `h-phone`                | сгенерировано                                          |
| `images/closeups/h-coat-rack.webp`            | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-coat-rack.png)            | `h-coat-rack`            | сгенерировано                                          |
| `images/closeups/h-keeper-photo.webp`         | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-keeper-photo.png)         | `h-keeper-photo`         | сгенерировано                                          |
| `images/closeups/h-armchair.webp`             | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-armchair.png)             | `h-armchair`             | сгенерировано                                          |
| `images/closeups/h-fireplace.webp`            | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-fireplace.png)            | `h-fireplace`            | сгенерировано                                          |
| `images/closeups/h-door-chain.webp`           | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-door-chain.png)           | `h-door-chain`           | сгенерировано (v3, выбитая дверь, одобрено владельцем) |
| `images/closeups/h-tea-tray.webp`             | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-tea-tray.png)             | `h-tea-tray`             | сгенерировано                                          |
| `images/closeups/h-nightstand.webp`           | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-nightstand.png)           | `h-nightstand`           | сгенерировано                                          |
| `images/closeups/h-desk.webp`                 | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-desk.png)                 | `h-desk`                 | сгенерировано                                          |
| `images/closeups/h-jacket.webp`               | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-jacket.png)               | `h-jacket`               | сгенерировано                                          |
| `images/closeups/h-portfel.webp`              | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-portfel.png)              | `h-portfel`              | сгенерировано                                          |
| `images/closeups/h-balcony-door.webp`         | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-balcony-door.png)         | `h-balcony-door`         | сгенерировано                                          |
| `images/closeups/h-partition.webp`            | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-partition.png)            | `h-partition`            | сгенерировано                                          |
| `images/closeups/h-linen-cart.webp`           | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-linen-cart.png)           | `h-linen-cart`           | сгенерировано                                          |
| `images/closeups/h-bin.webp`                  | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-bin.png)                  | `h-bin`                  | сгенерировано                                          |
| `images/closeups/h-window.webp`               | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-window.png)               | `h-window`               | сгенерировано                                          |
| `images/closeups/h-door8.webp`                | closeup        | 1024×1024 | [PNG](case-002-room-seven/h-door8.png)                | `h-door8`                | сгенерировано                                          |
| `images/clues/c-teacup.webp`                  | clue           | 512×512   | [PNG](case-002-room-seven/c-teacup.png)               | `c-teacup`               | сгенерировано                                          |
| `images/clues/c-empty-case.webp`              | clue           | 512×512   | [PNG](case-002-room-seven/c-empty-case.png)           | `c-empty-case`           | сгенерировано                                          |
| `images/clues/c-notebook.webp`                | clue           | 512×512   | [PNG](case-002-room-seven/c-notebook.png)             | `c-notebook`             | сгенерировано                                          |
| `images/clues/c-wallet.webp`                  | clue           | 512×512   | [PNG](case-002-room-seven/c-wallet.png)               | `c-wallet`               | сгенерировано                                          |
| `images/clues/c-wet-jacket.webp`              | clue           | 512×512   | [PNG](case-002-room-seven/c-wet-jacket.png)           | `c-wet-jacket`           | сгенерировано                                          |
| `images/clues/c-camera.webp`                  | clue           | 512×512   | [PNG](case-002-room-seven/c-camera.png)               | `c-camera`               | сгенерировано                                          |
| `images/clues/c-ampoule.webp`                 | clue           | 512×512   | [PNG](case-002-room-seven/c-ampoule.png)              | `c-ampoule`              | сгенерировано                                          |
| `images/clues/c-chronometer.webp`             | clue           | 512×512   | [PNG](case-002-room-seven/c-chronometer.png)          | `c-chronometer`          | сгенерировано                                          |
| `images/clues/c-partition.webp`               | clue           | 512×512   | [PNG](case-002-room-seven/c-partition.png)            | `c-partition`            | сгенерировано                                          |
| `images/closeups/portfel-open.webp`           | container      | 1024×1024 | [PNG](case-002-room-seven/portfel-open.png)           | `portfel-open`           | сгенерировано                                          |
| `images/closeups/teacup-inspection.webp`      | inspection     | 1024×1024 | [PNG](case-002-room-seven/teacup-inspection.png)      | `teacup-inspection`      | сгенерировано                                          |
| `images/closeups/partition-inspection.webp`   | inspection     | 1024×1024 | [PNG](case-002-room-seven/partition-inspection.png)   | `partition-inspection`   | сгенерировано                                          |
| `images/closeups/chronometer-inspection.webp` | inspection     | 1024×1024 | [PNG](case-002-room-seven/chronometer-inspection.png) | `chronometer-inspection` | сгенерировано                                          |
| `troupe/a14-boris/neutral.webp`               | portrait       | 768×1152  | [PNG](case-002-room-seven/a14-boris-neutral.png)      | `a14-boris-neutral`      | сгенерировано                                          |
| `troupe/a14-boris/nervous.webp`               | portrait       | 768×1152  | [PNG](case-002-room-seven/a14-boris-nervous.png)      | `a14-boris-nervous`      | сгенерировано                                          |
| `troupe/a14-boris/angry.webp`                 | portrait       | 768×1152  | [PNG](case-002-room-seven/a14-boris-angry.png)        | `a14-boris-angry`        | сгенерировано                                          |
| `troupe/a14-boris/sad.webp`                   | portrait       | 768×1152  | [PNG](case-002-room-seven/a14-boris-sad.png)          | `a14-boris-sad`          | сгенерировано                                          |
| `troupe/a14-boris/smug.webp`                  | portrait       | 768×1152  | [PNG](case-002-room-seven/a14-boris-smug.png)         | `a14-boris-smug`         | сгенерировано                                          |
| `troupe/a14-boris/broken.webp`                | portrait       | 768×1152  | [PNG](case-002-room-seven/a14-boris-broken.png)       | `a14-boris-broken`       | сгенерировано                                          |
| `troupe/a11-zoya/neutral.webp`                | portrait       | 768×1152  | [PNG](case-002-room-seven/a11-zoya-neutral.png)       | `a11-zoya-neutral`       | сгенерировано                                          |
| `troupe/a11-zoya/nervous.webp`                | portrait       | 768×1152  | [PNG](case-002-room-seven/a11-zoya-nervous.png)       | `a11-zoya-nervous`       | сгенерировано                                          |
| `troupe/a11-zoya/angry.webp`                  | portrait       | 768×1152  | [PNG](case-002-room-seven/a11-zoya-angry.png)         | `a11-zoya-angry`         | сгенерировано                                          |
| `troupe/a11-zoya/sad.webp`                    | portrait       | 768×1152  | [PNG](case-002-room-seven/a11-zoya-sad.png)           | `a11-zoya-sad`           | сгенерировано                                          |
| `troupe/a11-zoya/smug.webp`                   | portrait       | 768×1152  | [PNG](case-002-room-seven/a11-zoya-smug.png)          | `a11-zoya-smug`          | сгенерировано                                          |
| `troupe/a11-zoya/broken.webp`                 | portrait       | 768×1152  | [PNG](case-002-room-seven/a11-zoya-broken.png)        | `a11-zoya-broken`        | сгенерировано                                          |
| `troupe/a08-ruslan/neutral.webp`              | portrait       | 768×1152  | [PNG](case-002-room-seven/a08-ruslan-neutral.png)     | `a08-ruslan-neutral`     | сгенерировано                                          |
| `troupe/a08-ruslan/nervous.webp`              | portrait       | 768×1152  | [PNG](case-002-room-seven/a08-ruslan-nervous.png)     | `a08-ruslan-nervous`     | сгенерировано                                          |
| `troupe/a08-ruslan/angry.webp`                | portrait       | 768×1152  | [PNG](case-002-room-seven/a08-ruslan-angry.png)       | `a08-ruslan-angry`       | сгенерировано                                          |
| `troupe/a08-ruslan/sad.webp`                  | portrait       | 768×1152  | [PNG](case-002-room-seven/a08-ruslan-sad.png)         | `a08-ruslan-sad`         | сгенерировано                                          |
| `troupe/a08-ruslan/smug.webp`                 | portrait       | 768×1152  | [PNG](case-002-room-seven/a08-ruslan-smug.png)        | `a08-ruslan-smug`        | сгенерировано                                          |
| `troupe/a08-ruslan/broken.webp`               | portrait       | 768×1152  | [PNG](case-002-room-seven/a08-ruslan-broken.png)      | `a08-ruslan-broken`      | сгенерировано                                          |
| `troupe/a13-nadia/neutral.webp`               | portrait       | 768×1152  | [PNG](case-002-room-seven/a13-nadia-neutral.png)      | `a13-nadia-neutral`      | сгенерировано                                          |
| `troupe/a13-nadia/nervous.webp`               | portrait       | 768×1152  | [PNG](case-002-room-seven/a13-nadia-nervous.png)      | `a13-nadia-nervous`      | сгенерировано                                          |
| `troupe/a13-nadia/angry.webp`                 | portrait       | 768×1152  | [PNG](case-002-room-seven/a13-nadia-angry.png)        | `a13-nadia-angry`        | сгенерировано                                          |
| `troupe/a13-nadia/sad.webp`                   | portrait       | 768×1152  | [PNG](case-002-room-seven/a13-nadia-sad.png)          | `a13-nadia-sad`          | сгенерировано                                          |
| `troupe/a13-nadia/smug.webp`                  | portrait       | 768×1152  | [PNG](case-002-room-seven/a13-nadia-smug.png)         | `a13-nadia-smug`         | сгенерировано                                          |
| `troupe/a13-nadia/broken.webp`                | portrait       | 768×1152  | [PNG](case-002-room-seven/a13-nadia-broken.png)       | `a13-nadia-broken`       | сгенерировано                                          |
| `troupe/a12-dmitry/neutral.webp`              | portrait       | 768×1152  | [PNG](case-002-room-seven/a12-dmitry-neutral.png)     | `a12-dmitry-neutral`     | сгенерировано                                          |
| `troupe/a12-dmitry/nervous.webp`              | portrait       | 768×1152  | [PNG](case-002-room-seven/a12-dmitry-nervous.png)     | `a12-dmitry-nervous`     | сгенерировано                                          |
| `troupe/a12-dmitry/angry.webp`                | portrait       | 768×1152  | [PNG](case-002-room-seven/a12-dmitry-angry.png)       | `a12-dmitry-angry`       | сгенерировано                                          |
| `troupe/a12-dmitry/sad.webp`                  | portrait       | 768×1152  | [PNG](case-002-room-seven/a12-dmitry-sad.png)         | `a12-dmitry-sad`         | сгенерировано                                          |
| `troupe/a12-dmitry/smug.webp`                 | portrait       | 768×1152  | [PNG](case-002-room-seven/a12-dmitry-smug.png)        | `a12-dmitry-smug`        | сгенерировано                                          |
| `troupe/a12-dmitry/broken.webp`               | portrait       | 768×1152  | [PNG](case-002-room-seven/a12-dmitry-broken.png)      | `a12-dmitry-broken`      | сгенерировано                                          |
| `images/reconstruction/1.webp`                | reconstruction | 1200×800  | [PNG](case-002-room-seven/reconstruction-1.png)       | `reconstruction-1`       | сгенерировано                                          |
| `images/reconstruction/2.webp`                | reconstruction | 1200×800  | [PNG](case-002-room-seven/reconstruction-2.png)       | `reconstruction-2`       | сгенерировано                                          |
| `images/reconstruction/3.webp`                | reconstruction | 1200×800  | [PNG](case-002-room-seven/reconstruction-3.png)       | `reconstruction-3`       | сгенерировано                                          |
| `images/cover.webp`                           | cover          | 720×1080  | [PNG](case-002-room-seven/cover.png)                  | `cover`                  | сгенерировано                                          |

Контакт-листы: [локации](../docs/devlog/assets/room-seven/locations.jpg), [крупные планы](../docs/devlog/assets/room-seven/closeups.jpg), [предметы и детали](../docs/devlog/assets/room-seven/items.jpg), [мастера](../docs/devlog/assets/room-seven/masters.jpg), [30 портретов](../docs/devlog/assets/room-seven/portraits.jpg), [реконструкция и обложка](../docs/devlog/assets/room-seven/ending.jpg). Все 68 оригиналов сгенерированы; заглушек нет.

## Дело № 3 — «Холодная камера»

31 изображение по разделу «Арт» в `docs/cases/case-003-cold-room.md`. Размеры — из таблицы дела; WebP q80, предмет с прозрачностью. Оригиналы PNG — Git LFS. Точные промпты, референсы и правки — [prompts.json](case-003-cold-room/prompts.json), параметры экспорта — [manifest.json](case-003-cold-room/manifest.json). Портреты сохраняются в `public/troupe/`, остальные файлы — в `public/cases/case-003-cold-room/`.

| Игровой файл                          | Тип            | Размер    | Оригинал PNG                                     | Промпт / ключ        | Статус        |
| ------------------------------------- | -------------- | --------- | ------------------------------------------------ | -------------------- | ------------- |
| `images/locations/yard.webp`          | location       | 1600×1067 | [PNG](case-003-cold-room/yard.png)               | `yard`               | сгенерировано |
| `images/locations/shop.webp`          | location       | 1600×1067 | [PNG](case-003-cold-room/shop.png)               | `shop`               | сгенерировано |
| `images/locations/chamber.webp`       | location       | 1600×1067 | [PNG](case-003-cold-room/chamber.png)            | `chamber`            | сгенерировано |
| `images/closeups/h-booth.webp`        | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-booth.png)            | `h-booth`            | сгенерировано |
| `images/closeups/h-booth-table.webp`  | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-booth-table.png)      | `h-booth-table`      | сгенерировано |
| `images/closeups/h-truck-cab.webp`    | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-truck-cab.png)        | `h-truck-cab`        | сгенерировано |
| `images/closeups/h-truck-back.webp`   | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-truck-back.png)       | `h-truck-back`       | сгенерировано |
| `images/closeups/h-scales.webp`       | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-scales.png)           | `h-scales`           | сгенерировано |
| `images/closeups/h-desk.webp`         | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-desk.png)             | `h-desk`             | сгенерировано |
| `images/closeups/h-safe-open.webp`    | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-safe-open.png)        | `h-safe-open`        | сгенерировано |
| `images/closeups/h-schedule.webp`     | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-schedule.png)         | `h-schedule`         | сгенерировано |
| `images/closeups/h-repair-board.webp` | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-repair-board.png)     | `h-repair-board`     | сгенерировано |
| `images/closeups/h-thermograph.webp`  | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-thermograph.png)      | `h-thermograph`      | сгенерировано |
| `images/closeups/h-chamber-door.webp` | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-chamber-door.png)     | `h-chamber-door`     | сгенерировано |
| `images/closeups/h-seal.webp`         | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-seal.png)             | `h-seal`             | сгенерировано |
| `images/closeups/h-outline.webp`      | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-outline.png)          | `h-outline`          | сгенерировано |
| `images/closeups/h-frost-floor.webp`  | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-frost-floor.png)      | `h-frost-floor`      | сгенерировано |
| `images/closeups/h-inner-door.webp`   | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-inner-door.png)       | `h-inner-door`       | сгенерировано |
| `images/closeups/h-racks.webp`        | closeup        | 1024×1024 | [PNG](case-003-cold-room/h-racks.png)            | `h-racks`            | сгенерировано |
| `images/clues/c-bottle.webp`          | clue           | 512×512   | [PNG](case-003-cold-room/c-bottle.png)           | `c-bottle`           | сгенерировано |
| `images/reconstruction/1.webp`        | reconstruction | 1200×800  | [PNG](case-003-cold-room/reconstruction-1.png)   | `reconstruction-1`   | сгенерировано |
| `images/reconstruction/2.webp`        | reconstruction | 1200×800  | [PNG](case-003-cold-room/reconstruction-2.png)   | `reconstruction-2`   | сгенерировано |
| `images/reconstruction/3.webp`        | reconstruction | 1200×800  | [PNG](case-003-cold-room/reconstruction-3.png)   | `reconstruction-3`   | сгенерировано |
| `images/cover.webp`                   | cover          | 1024×1536 | [PNG](case-003-cold-room/cover.png)              | `cover`              | сгенерировано |
| `troupe/a06-semyon/neutral.webp`      | portrait       | 768×1152  | [PNG](case-003-cold-room/a06-semyon-neutral.png) | `a06-semyon-neutral` | сгенерировано |
| `troupe/a06-semyon/nervous.webp`      | portrait       | 768×1152  | [PNG](case-003-cold-room/a06-semyon-nervous.png) | `a06-semyon-nervous` | сгенерировано |
| `troupe/a06-semyon/angry.webp`        | portrait       | 768×1152  | [PNG](case-003-cold-room/a06-semyon-angry.png)   | `a06-semyon-angry`   | сгенерировано |
| `troupe/a06-semyon/sad.webp`          | portrait       | 768×1152  | [PNG](case-003-cold-room/a06-semyon-sad.png)     | `a06-semyon-sad`     | сгенерировано |
| `troupe/a06-semyon/smug.webp`         | portrait       | 768×1152  | [PNG](case-003-cold-room/a06-semyon-smug.png)    | `a06-semyon-smug`    | сгенерировано |
| `troupe/a06-semyon/broken.webp`       | portrait       | 768×1152  | [PNG](case-003-cold-room/a06-semyon-broken.png)  | `a06-semyon-broken`  | сгенерировано |
| `troupe/a10-pavel/neutral.webp`       | portrait       | 768×1152  | [PNG](case-003-cold-room/a10-pavel-neutral.png)  | `a10-pavel-neutral`  | сгенерировано |

Контакт-листы: [локации](../docs/devlog/assets/cold-room/locations.jpg), [крупные планы](../docs/devlog/assets/cold-room/closeups.jpg), [предмет](../docs/devlog/assets/cold-room/item.jpg), [реконструкция](../docs/devlog/assets/cold-room/reconstruction.jpg), [обложка](../docs/devlog/assets/cold-room/cover.jpg), [портреты](../docs/devlog/assets/cold-room/portraits.jpg). Координаты и передача планировщику — [devlog](../docs/devlog/2026-11-13-16-cold-room-assets.md).
