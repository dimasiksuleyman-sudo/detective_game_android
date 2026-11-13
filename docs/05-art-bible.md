# 05. Арт-библия и промпты для картинок

Весь арт генерирует **агент** встроенной генерацией изображений по этим промптам (ADR-020; правила процесса — `AGENTS.md` §4, полный список и статусы — `art/ASSETS.md`). Владелец одобряет результат по контакт-листам. Промпты на английском дают чуть более предсказуемый результат; рядом — пояснение по-русски. Все картинки создаются **заранее**, приложение их не генерирует.

> **Сезоны (ADR-031).** Этот документ — общие правила для всех сезонов: форматы, размеры, процесс, портреты по мастеру, приёмка. Мир, STYLE_CORE, палитра картинок и труппа — свои у каждого сезона, в `docs/seasons/`. Разделы §1 (стиль), §3.4 (труппа) и §5 (промпты пилота) ниже относятся к **сезону 1 «Ветрогорск»** (`docs/seasons/season-01-vetrogorsk.md`). Палитра §1 остаётся палитрой интерфейса для всей игры.

## 1. Стиль

**Нуарная графическая новелла:** тушь + акварельные заливки, приглушённая палитра, один тёплый акцент, драматичный свет, фактура бумаги. Город Ветрогорск — дождливый северный порт, наши дни.

Палитра (для UI тоже):
| Токен | HEX | Где |
|---|---|---|
| `--ink` | `#12181D` | фон, тени |
| `--slate` | `#1E2A33` | фон портретов, панели |
| `--teal-gray` | `#4A6670` | второстепенное |
| `--sepia` | `#C9B48F` | бумага, документы |
| `--paper` | `#EDE4D3` | текст на тёмном, карточки |
| `--accent` | `#D2691E` | акцент (лампа, важное, кнопки) |
| `--blood` | `#7A1F1F` | редкие тревожные акценты |

### 1.1. STYLE_CORE — добавлять в КАЖДЫЙ промпт
```
Noir graphic novel illustration, confident ink linework with loose watercolor washes, muted palette of deep slate blue, desaturated teal and warm sepia, a single accent color of burnt orange, dramatic chiaroscuro lighting, visible cold-press paper texture, subtle film grain, contemporary rainy northern port city atmosphere. No text, no letters, no numbers, no watermark, no logo, no signature.
```

### 1.2. Чего избегать (дописывать при проблемах)
```
Avoid: photorealism, 3D render look, anime style, glossy skin, extra fingers, distorted hands, text or signage, logos, gore, visible blood pools.
```

## 2. Технические требования

| Тип | Генерировать | Итог в игре (WebP) | Фон | Путь |
|---|---|---|---|---|
| Портрет актёра (эмоция) | 1024×1536 (2:3) | 768×1152, q≈80 | сплошной `#1E2A33`-градиент | `troupe/{actorId}/{emotion}.webp` |
| Локация | 1024×1536 (2:3, вертикаль) | 1080×1620, q≈80 | — | `images/locations/{locationId}.webp` |
| Крупный план | 1024×1024 | 1024×1024, q≈80 | — | `images/closeups/{hotspotId}.webp` |
| Улика-предмет | 1024×1024 | 512×512, q≈85 | **прозрачный** | `images/clues/{clueId}.webp` |
| Реконструкция | 1536×1024 (3:2) | 1200×800 | — | `images/reconstruction/{n}.webp` |
| Обложка дела | 1024×1536 | 720×1080 | — | `images/cover.webp` |
| Фоны UI | 1024×1536 | 1080×1620 | — | `public/ui/*.webp` |

- Конвертация: `tools/build-pack.ts` (sharp): ресайз, WebP, проверка размеров.
- **Никакого текста на картинках.** Чеки, записки, билеты, переписки, номера машин, надписи на обороте фото — рендерятся кодом поверх бумажной текстуры (`DocumentRender`).
- Тела в кадре не показываем: максимум — меловой контур, накрытая фигура вне фокуса, перевёрнутый стул.

## 3. «Труппа актёров» (переиспользуемые персонажи)

В каждом деле актёры получают новые имена и роли. Внешность и одежда фиксированы (это и есть консистентность).

### 3.1. Процесс создания актёра (консистентность лица)
1. **Мастер-портрет (neutral)** — генерация по шаблону 3.2. Сделать 3–4 варианта, выбрать лучший. Сохранить как референс.
2. **Эмоции** — в том же чате (или в новом, загрузив мастер-портрет) запрос-правка по шаблону 3.3, **по одной эмоции за раз**.
3. Проверка: то же лицо, причёска, одежда, свет, кадрирование. Если «поплыло» — повторить с фразой «Keep the face identical to the reference image».
4. Опционально: кадр `blink` (neutral с закрытыми глазами) для анимации моргания.

### 3.2. Шаблон мастер-портрета
```
{{STYLE_CORE}}
Chest-up portrait of {{APPEARANCE}}, wearing {{CLOTHES}}. Seated across an interrogation table, facing the viewer at a slight three-quarter angle, eye level. Expression: calm, guarded, mouth closed, looking straight at the viewer.
Lighting: warm burnt-orange key light from above right like a single desk lamp, cool blue rim light from the left, deep shadows.
Background: plain dark slate-blue gradient (#1E2A33), no objects.
Composition: vertical 2:3, head in the upper third, shoulders fill the lower part, hands out of frame.
```

### 3.3. Шаблон эмоции (правка по референсу)
```
Edit the attached reference portrait. Keep EXACTLY the same person: identical face, age, hairstyle, clothing, lighting, background, framing and art style. Change ONLY the facial expression and head/shoulder posture to: {{EMOTION}}.
{{STYLE_CORE}}
```

| emotion | {{EMOTION}} |
|---|---|
| `neutral` | (мастер-портрет) |
| `nervous` | eyes glancing to the side, faint sweat on the forehead, lips pressed tight, shoulders slightly raised, tense |
| `angry` | brows furrowed, jaw clenched, leaning slightly forward, glaring at the viewer, nostrils flared |
| `sad` | eyes glistening, gaze lowered, corners of the mouth down, shoulders dropped |
| `smug` | one eyebrow raised, a thin half-smile, chin slightly lifted, confident relaxed shoulders |
| `broken` | head lowered, eyes red and exhausted, looking down at the table, slumped shoulders, defeated |
| `blink` (опц.) | same as reference but with eyes gently closed |

### 3.4. Состав труппы (v1: 16 актёров; пилот использует 6)

| actorId | {{APPEARANCE}} | {{CLOTHES}} | Типажи |
|---|---|---|---|
| `a01-arkady` | a heavyset man in his early fifties, receding grey hair combed back, tired kind eyes, short grey beard | a burgundy velvet blazer over a black shirt | владелец заведения, жертва, начальник |
| `a02-gleb` | a lean sharp-featured man in his late forties, slicked-back dark hair with grey temples, light stubble, thin lips | an expensive charcoal overcoat over a navy suit, no tie | бизнесмен, партнёр, чиновник |
| `a03-vera` | a striking woman in her early thirties, dark wavy shoulder-length hair, red lipstick, smoky eye makeup | a dark green satin evening dress with a thin black shawl | певица, актриса, светская львица |
| `a04-timur` | a wiry young man in his mid-twenties, buzzed black hair, small scar on the eyebrow, restless eyes | a black t-shirt under an open worn denim jacket, rolled sleeves | бармен, курьер, мелкий жулик |
| `a05-olga` | a composed woman around fifty, short ash-blonde bob, thin rimless glasses, sharp cheekbones | a beige trench coat over a grey turtleneck | родственница, бухгалтер, учительница |
| `a06-semyon` | an elderly man in his seventies, white unkempt hair, deep wrinkles, bushy eyebrows | a faded navy fisherman's sweater and a flat cap | сторож, рыбак, старый моряк |
| `a07-lida` | a young woman in her early twenties, freckles, auburn hair in a messy bun, large curious eyes | an oversized mustard hoodie | студентка, стажёрка, блогер |
| `a08-ruslan` | a broad-shouldered man in his late thirties, shaved head, thick neck, short dark beard | a black leather jacket over a grey hoodie | охранник, водитель, бывший боксёр |
| `a09-irina` | an elegant woman in her mid-forties, platinum hair in a tight chignon, pearl earrings, cold grey eyes | a tailored white blazer over a black silk blouse | директор, адвокат, вдова |
| `a10-pavel` | a nervous thin man in his early thirties, round glasses, messy brown hair, pale | a wrinkled checkered shirt with a loose knitted tie | айтишник, бухгалтер, лаборант |
| `a11-zoya` | a stout cheerful woman in her sixties, curly dyed-red hair, reading glasses on a chain | a floral blouse and a knitted cardigan | вахтёрша, хозяйка гостиницы, соседка |
| `a12-dmitry` | a handsome man in his early thirties, tousled blond hair, easy charming smile, blue eyes | an unbuttoned white shirt under a camel coat | сердцеед, фотограф, наследник |
| `a13-nadia` | a serious woman in her late thirties, black hair in a low ponytail, no makeup, tired eyes | a dark navy nurse's uniform under a grey cardigan | медсестра, врач, сиделка |
| `a14-boris` | a jowly man in his sixties, thick grey moustache, bald on top, small shrewd eyes | a brown three-piece suit, a gold pocket watch chain | антиквар, ростовщик, депутат |
| `a15-kira` | a sharp young woman in her late twenties, asymmetrical black bob, silver nose ring, dark eyeliner | a black turtleneck and a silver chain necklace | художница, хакер, журналистка |
| `a16-chief` | a weathered man in his late fifties, grey crew cut, heavy-lidded eyes, deep frown lines | a rumpled grey police-style overcoat, loosened dark tie | **Шеф** — постоянный NPC подсказок (для полного набора подготовлены все 6 эмоций) |

Труппа хранится в `public/troupe/` (встроенная) и расширяется паками.

## 4. Шаблоны остальных картинок

### 4.1. Локация
```
{{STYLE_CORE}}
Environment illustration of {{LOCATION_DESCRIPTION}}, {{TIME_AND_LIGHT}}. No people in the scene.
Vertical 2:3 composition for a phone screen, eye-level wide view.
The following objects must be clearly visible, well separated from each other and easy to tap: {{HOTSPOT_OBJECTS}}.
```

### 4.2. Крупный план хотспота
```
{{STYLE_CORE}}
Close-up illustration of {{OBJECT_AND_DETAIL}}, as seen by a detective leaning in with a flashlight. Square 1:1 composition, shallow depth of field, the key detail in the center: {{KEY_DETAIL}}.
```

### 4.3. Улика-предмет
```
{{STYLE_CORE}}
A single object: {{OBJECT}}. Centered, three-quarter top-down view, soft contact shadow, isolated on a transparent background (if transparency is unavailable: plain flat white background). Square 1:1. No text on the object.
```
(Если прозрачность не получилась — удалить фон в постобработке; это делает `build-pack` или вручную.)

### 4.4. Реконструкция (финальные кадры)
```
{{STYLE_CORE}}
Cinematic comic panel, 3:2 horizontal. {{SCENE}}. Characters: {{ACTORS_SHORT_DESCRIPTION}} (match the attached reference portraits). Dramatic angle, strong shadows, emotional but not graphic — no blood, no visible injury.
```
К запросу прикладывать мастер-портреты участвующих актёров.

### 4.5. Обложка дела
```
{{STYLE_CORE}}
Book-cover style key art for a detective case titled (do not render the title) "{{TITLE}}". {{COVER_SCENE}}. Vertical 2:3, strong central silhouette, empty space in the top quarter for the title overlay.
```

### 4.6. UI-фоны и текстуры (один раз на всю игру)
| Файл | Промпт (после STYLE_CORE) |
|---|---|
| `ui/interrogation-bg.webp` | `Empty interrogation room seen from the detective's chair: a metal table edge at the bottom, a single hanging lamp casting a cone of burnt-orange light, a dark one-way mirror on the back wall, rain streaks on a small high window. Vertical 2:3. The center area is darker and empty, to place a character portrait over it.` |
| `ui/cork-board.webp` | `Top-down view of a large cork board on a dark wooden wall, a few empty pin holes, warm lamp light from the top left. Vertical 2:3, no papers pinned, no text.` |
| `ui/paper-texture.webp` | `Seamless texture of slightly aged off-white paper with subtle fibers and faint coffee stains at the edges, flat lighting, no text.` (1024×1024) |
| `ui/case-folder.webp` | `Top-down view of a closed worn manila case folder on a dark desk, a paperclip, a coffee ring, a fountain pen at the side. Vertical 2:3, no text, no labels.` |
| `ui/main-menu-bg.webp` | `A rainy night street of a northern port city, wet cobblestones reflecting a single burnt-orange street lamp, cranes of the port in the fog in the distance, a lone silhouette in a trench coat seen from behind. Vertical 2:3, empty dark sky at the top for the logo.` |
| `ui/handover-bg.webp` | `Close-up of a hand in a leather glove passing a closed case file to another hand across a table in darkness, burnt-orange rim light. Vertical 2:3, lots of dark negative space.` |
| `icon/app-icon.png` | `App icon: a stylized magnifying glass whose lens reflects a single burnt-orange desk lamp, on a deep slate-blue background, bold simple shapes readable at small size, flat noir ink style, square, no text.` (1024×1024; адаптивная иконка — передний план отдельно) |

## 5. Промпты пилотного дела «Синяя сова»

Актёры: `a01-arkady` (жертва), `a02-gleb`, `a03-vera`, `a04-timur`, `a05-olga`, плюс `a16-chief`.

### 5.1. Локации
| Файл | {{LOCATION_DESCRIPTION}} / {{TIME_AND_LIGHT}} / {{HOTSPOT_OBJECTS}} |
|---|---|
| `locations/l-hall.webp` | the main hall of a small old jazz bar called "Blue Owl" after closing time: chairs upturned on tables, a small stage with a grand piano and a microphone stand / dim, only a few warm wall lamps, rain outside the windows / **a wall with framed old photographs near the entrance; a cork notice board with posters; a long wooden bar counter with empty shelves behind it; the grand piano on the stage** |
| `locations/l-office.webp` | a cramped bar owner's office behind the hall: a heavy wooden desk with papers, a green banker's lamp, an old leather sofa, a small steel wall safe, a window to the alley, an overturned chair; on the floor near the desk a chalk outline marking (no body) / cold blue morning light from the window mixed with the green lamp / **the desk with papers and a diary; the steel wall safe; the leather sofa; the floor area with the chalk outline and a small shelf with an award statuette missing (empty spot with a dust ring); the window** |
| `locations/l-alley.webp` | a narrow wet back alley behind the bar at night: a metal back door with a single bulb above it, two large dumpsters, puddles, a fire escape, a distant street with a parking lot sign glowing (no readable text) / rain, single bulb burnt-orange light, blue darkness / **the metal back door with its lock; the dumpsters; a puddle near the door with something small floating; the far end of the alley leading to a street parking lot** |

### 5.2. Крупные планы
| Файл | {{OBJECT_AND_DETAIL}} / {{KEY_DETAIL}} |
|---|---|
| `closeups/h-photos.webp` | framed vintage photographs on a bar wall / one photo of two smiling men standing next to a new silver sedan in front of the bar entrance |
| `closeups/h-board.webp` | a cork notice board with jazz concert posters (no readable text) / a poster with a silhouette of a female singer at a microphone |
| `closeups/h-counter.webp` | behind a bar counter, empty liquor shelves / dust-free rectangles where bottle crates used to stand |
| `closeups/h-desk.webp` | a messy wooden office desk / an open leather diary next to a stack of papers and a green banker's lamp |
| `closeups/h-safe.webp` | a small steel wall safe with a four-digit combination dial / the dial, the door slightly scratched |
| `closeups/h-sofa.webp` | under an old leather sofa / a small paper ticket stub half-hidden in the dust |
| `closeups/h-floor.webp` | an office floor next to a desk with a chalk outline edge visible / a heavy bronze saxophone statuette lying on the floor, wiped clean, its marble base slightly chipped |
| `closeups/h-door.webp` | the lock of a metal back door / no scratches on the lock, a clean key mark — it was opened with a key |
| `closeups/h-dumpster.webp` | behind a dumpster in a wet alley / a cardboard crate with whisky bottles hidden under a black plastic bag |
| `closeups/h-puddle.webp` | a puddle near a back door at night / a soaked small paper parking stub floating in the puddle |
| `closeups/h-alley-end.webp` | the mouth of a narrow wet alley opening onto a rainy harbor street with a small paid parking lot in the distance / a soggy small paper receipt stuck to the wet cobblestones by the brick wall, no readable text (ADR-035) |

### 5.3. Улики-предметы (прозрачный фон)
| Файл | {{OBJECT}} |
|---|---|
| `clues/c-statuette.webp` | a heavy bronze statuette of a saxophone player on a chipped black marble base |
| `clues/c-whisky-crate.webp` | an open cardboard crate with six bottles of whisky, the cardboard wet from rain |
| `clues/c-photo.webp` | an old framed photograph of two men in their thirties shaking hands next to a new silver sedan in front of a bar entrance (faces resemble the attached reference portraits of Arkady and Gleb, younger) |
| `clues/c-ledger.webp` | two thin black notebooks (accounting ledgers) tied with a rubber band |
| `clues/c-diary.webp` | a worn brown leather diary, closed, with a ribbon bookmark |

Документы (рендер кодом, картинка не нужна): `c-train-ticket` (ticket), `c-parking-stub` (ticket), `c-dismissal` (official), `c-poster` (poster, фон — `closeups/h-board`), оборот фото (photo-back), страницы ежедневника (diary), строки бухгалтерии (ledger).

### 5.4. Реконструкция (3 кадра)
1. `reconstruction/1.webp` — `Night, rain. A lean man in a charcoal overcoat (Gleb) unlocks the metal back door of a jazz bar with his own key; at the far end of the alley a young man in a denim jacket (Timur) hides behind a dumpster, watching.`
2. `reconstruction/2.webp` — `A cramped office lit by a green banker's lamp. A heavyset man in a burgundy velvet blazer (Arkady) slams two black ledgers on the desk, furious; the lean man in the charcoal overcoat (Gleb) stands opposite him, his hand reaching toward a bronze saxophone statuette on a shelf. Silhouettes, tension, no violence shown.`
3. `reconstruction/3.webp` — `The lean man in the charcoal overcoat (Gleb) hurries out of the back alley toward a silver sedan in a street parking lot, rain pouring; a small paper stub falls from his pocket into a puddle.`

### 5.5. Обложка
`cover.webp` — `{{COVER_SCENE}}` = `The neon-less entrance of an old jazz bar on a rainy night, a carved wooden owl above the door, warm light leaking from a half-open door, a silhouette of a saxophone statuette in the window.`

## 6. Чек-лист приёмки картинки
- [ ] Стиль совпадает с остальными (сравнить рядом на одном экране).
- [ ] Нет текста, логотипов, лишних пальцев.
- [ ] У портретов: то же лицо, одежда, свет, фон, кадрирование, что у мастер-портрета.
- [ ] У локаций: все объекты-хотспоты различимы и не перекрываются.
- [ ] Нет натурализма (рейтинг 12+).
- [ ] Файл назван по схеме и лежит в нужной папке.

## Подключённый первый набор M3

Обложка и три локации пилота подготовлены из art/pilot/*.png через `npx tsx tools/build-pack.ts --art-only`. Манифест art/pilot/manifest.json определяет готовые ресурсы; полный актуальный список — в `art/ASSETS.md`, заглушек в пилоте больше нет. Локации увеличены с исходных 1024×1536 до согласованных 1080×1620 без обещания новой детализации (ADR-016). Зоны осмотра обновлены в case.json.

## Статуэтка для осмотра M3

Добавлены art/pilot/statuette-closeup.png (на полу) и statuette-item.png (прозрачный фон), сгенерированные через image_gen по кабинету и друг другу. Оригиналы 1254×1254. Первый конвертируется в closeups/h-floor.webp 1024×1024 q80, второй в clues/c-statuette.webp 512×512 q85. Скол рисуется как естественная деталь материала без подсветки/врезки. Манифест подготовки теперь задаёт реальные размеры источника и quality для каждого файла; старые размеры остаются defaults.

## Дополнение сейфа (ADR-028)

Пять ресурсов по STYLE_CORE: `closeups/h-safe-open.webp` (открытый сейф, четыре предмета в отдельных областях), `closeups/h-ledger-spread.webp` (разворот без сгенерированного текста), `clues/c-envelope.webp`, `clues/c-will.webp`, `clues/c-lawyer-card.webp` (прозрачные предметы). Полные промпты и использованные референсы — `art/pilot/safe-prompts.json`, статусы и размеры — `art/ASSETS.md`. Надписи «Вере — НЕТ», «переписать?», «Пн, 10:00», таблица и подпись рисуются кодом. Крупные планы 1024², предметы 512²; оригиналы PNG в art/pilot. Контакт-листы — docs/devlog/assets/safe-puzzle/. Всего 63 ресурса, заглушек нет; одобрение владельца ещё не получено.

## Иконка приложения и сплэш (ADR-029)

Мастер art/app/app-icon.png: лупа с одной настольной лампой, акцент #D2691E, фон #1E2A33. Foreground и monochrome — отдельные прозрачные 1024²; значимое содержимое вписано в центральный круг диаметром 590 px, внутри безопасного круга 66/108. Monochrome — одноцветное кольцо с ручкой, центр прозрачный. Background — однотонный #1E2A33. Сплэш #12181D: PNG 2732², foreground по центру, мотив меньше 25% ширины, splash-dark идентичен. Текста/букв нет.

Android 12+ использует системную иконку на #12181D, Android 8–11 — ресурсы legacy и совместимую тему. Размеры: assets/ → @capacitor/assets 4.0.0 → Android, затем воспроизводимое дополнение XML/monochrome; входы готовит tools/prepare-app-assets.ts, дополнение — tools/finalize-app-assets.ts. Монохромный слой и запускная иконка также генерируются скриптом. Android-ресурсы — обычный git, исходные PNG art/app и art/store — LFS.

Магазины: art/store/icon-512.png — RGBA с alpha=255, без скруглений; feature-1024x500.png — пустая «Синяя сова», центральная лампа, без надписей. Контакт-лист — docs/devlog/assets/app-icon/contact-sheet.jpg.
