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
