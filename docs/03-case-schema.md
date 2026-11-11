# 03. Формат дела («библия дела»)

Дело — это один файл `case.json` + картинки. Схема реализуется в `src/content/schema.ts` на **Zod**; ниже — эквивалент на TypeScript. `schemaVersion` = **1**. Любое изменение схемы — через ADR + обновление валидатора + миграция пилотного дела.

Все `id` — латиница, `kebab-case` или с префиксом (`s-gleb`, `c-ledger`, `f-back-door-key`). Все тексты — русский.

```ts
type CaseFile = {
  schemaVersion: 1;
  id: string;                    // "case-001-blue-owl"
  version: number;               // 1, 2… (для обновления паков)
  minAppVersion: string;         // "1.0.0"
  title: string;                 // "Синяя сова"
  tagline: string;               // одна строка на обложку
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
  players: { min: number; max: number };
  cover: ImageRef;               // обложка дела
  setting: { city: string; place: string; dateLabel: string; weather: string };
  briefing: string;              // текст для общего экрана (до ~150 слов)

  victim: {
    name: string; age: number; occupation: string;
    actorId: string;             // портрет из труппы (эмоция neutral, CSS «фото из дела»)
    bio: string;                 // что известно всем
    causeOfDeath: string;        // официальная версия на брифинге
    foundAt: string;             // где/когда/кем найден
    timeOfDeathWindow: string;   // "между 23:30 и 00:15"
  };

  motives: Option[];             // 4–6 вариантов для обвинения, один верный
  methods: Option[];             // 3–5 вариантов, один верный

  solution: {
    culpritId: string;           // id подозреваемого
    motiveId: string;
    methodId: string;
    keyEvidence: string[];       // id улик/фактов; хотя бы одна должна быть приложена к обвинению
    explanation: string;         // «Как всё было» (до ~250 слов)
    reconstruction: { image: ImageRef; caption: string }[];  // 2–4 кадра
  };

  timelineTruth: { time: string; event: string }[];  // правдивая хронология для финала (НЕ для ИИ)

  facts: Fact[];
  suspects: Suspect[];
  locations: Location[];
  clues: Clue[];
  hints: Hint[];
};

type Option = { id: string; label: string };
type ImageRef = string;          // путь внутри пака: "images/locations/office.webp"

type Fact = {
  id: string;
  text: string;                  // КАНОНИЧЕСКИЙ текст, который попадёт в блокнот
  time?: string;                 // "23:31" — если есть, факт попадает во вкладку «Хронология»
  importance: "key" | "supporting" | "red_herring" | "flavor";
  proves?: ("motive" | "method" | "opportunity")[]; // ADR-006: проверяемое назначение доказательства
  aboutSuspectIds?: string[];    // о ком факт (для фильтров блокнота)
};

type Suspect = {
  id: string;
  actorId: string;               // портреты из труппы: troupe/{actorId}/{emotion}.webp
  name: string; age: number;
  occupation: string;
  relationToVictim: string;      // видно всем на брифинге
  publicProfile: string;         // видно всем: 1–2 предложения

  // --- материал для ИИ и для офлайн-ответов ---
  personality: string;           // характер: 2–3 предложения
  speechStyle: string;           // манера речи: обращение на «вы»/«ты», словечки, длина фраз
  coverStory: string;            // легенда — что персонаж рассказывает о том вечере (ложь или правда)
  sensitiveTopics: string[];     // темы, на которых нервничает (без раскрытия правды!), напр. "где он был после 23:00"
  shareableFactIds: string[];    // факты, которые готов рассказать, если спросят
  hiddenTruths: HiddenTruth[];   // что скрывает; правда попадает в промпт ТОЛЬКО после слома
  breakThreshold: number;        // 0–10, стресс, нужный для слома уликой (обычно 4–6)
  breakpoints: Breakpoint[];
  clueReactions: { clueId: string; reaction: string }[];   // реакции на прочие улики (необязательно)
  offlineQA: OfflineQA[];        // 6–10 вопросов (для режима «Классика» и как опора для ИИ)
  isCulprit: boolean;            // дублирует solution.culpritId — валидатор сверяет; в промпт НЕ попадает
};

type HiddenTruth = {
  id: string;
  topic: string;                 // "куда ездил после 23:00"
  lie: string;                   // что говорит до слома
  truth: string;                 // что признаёт после слома (может быть частичной правдой)
};

type Breakpoint = {
  clueId: string;                // улика, которую надо предъявить
  requiresFactIds?: string[];    // доп. условие: игрок должен знать эти факты
  ignoreStress?: boolean;        // слом без учёта порога
  unlocksTruthIds: string[];     // какие HiddenTruth становятся правдой в промпте
  revealsFactIds: string[];      // какие факты получает игрок
  confession: string;            // офлайн-текст признания (1–3 предложения)
};

type OfflineQA = {
  id: string;
  question: string;              // как кнопка: "Где вы были после 23:00?"
  answer: string;                // ответ в манере персонажа
  revealsFactIds: string[];      // обычно shareable-факты
  requiresClueId?: string;       // вопрос появляется, только если у игрока есть улика
  requiresFactId?: string;       // …или факт
  stressDelta?: number;          // по умолчанию 0; вопрос на больную тему — +1
};

type Location = {
  id: string;
  name: string;
  description: string;           // 1–2 предложения при входе
  image: ImageRef;               // вертикальная 2:3
  hotspots: Hotspot[];           // 3–6 зон
};

type Hotspot = {
  id: string;
  label: string;                 // "Письменный стол"
  rect: { x: number; y: number; w: number; h: number };  // нормализовано 0..1 от картинки
  closeup?: ImageRef;            // крупный план (если нет — показывается улика или только текст)
  text: string;                  // что видит детектив
  clueId?: string;               // улика, которая выдаётся
  revealsFactIds?: string[];     // факты, которые даёт сам осмотр (напр. «замок не взломан»)
  requiresFactId?: string;       // зона закрыта, пока игрок не знает факт (напр. код сейфа)
  lockedText?: string;           // текст для закрытой зоны: "Сейф заперт на кодовый замок."
  minigame?: "dust" | "uv" | "tilt" | "blow";   // этап M6
};

type Clue = {
  id: string;
  name: string;
  kind: "object" | "document" | "photo" | "message";
  image?: ImageRef;              // для object/photo — картинка 1:1 (прозрачный фон для object)
  document?: DocumentRender;     // для document/message — рендер кодом (никакого текста в картинках!)
  description: string;          // что видит детектив
  revealsFactIds: string[];      // факты, которые игрок получает вместе с уликой
  isKey: boolean;
};

type DocumentRender = {
  template: "receipt" | "ticket" | "note" | "ledger" | "diary" | "chat" | "photo-back" | "poster" | "official";
  fields: Record<string, string | string[]>;   // данные для шаблона
};

type Hint = {
  afterRound: number;            // показать в начале этого раунда…
  unlessAnyPlayerHas: string;    // …если ни у кого нет этой улики/факта
  text: string;                  // реплика Шефа
};
```

## Правила валидатора (обязательные)
Реализуются в `tools/validate-case.ts` и в unit-тестах для встроенных дел.

1. **Ссылки:** все `id` уникальны; все ссылки (`clueId`, `factId`, `actorId`, картинки) существуют.
2. **Решение согласовано:** `solution.culpritId` = единственный подозреваемый с `isCulprit: true`; мотив и способ есть в списках.
3. **Решаемость (симуляция):** начиная с пустого блокнота, жадно применять все доступные действия (хотспоты без требований → улики → факты → вопросы с требованиями → брейкпоинты при наличии улик → хотспоты с `requiresFactId`), пока что-то открывается. В итоге должны быть достижимы:
   - все факты с `importance: "key"`;
   - все `solution.keyEvidence`;
   - для виновного — хотя бы по одному key-факту на **мотив**, **способ** и **возможность** (размечаются в `facts[].text`/тегах; для v1 — список `keyEvidence` покрывает все три, агент добавляет поле `proves?: ("motive"|"method"|"opportunity")[]` в Fact, если удобно — через ADR).
4. **Невиновные:** у каждого невиновного есть достижимый факт, подтверждающий алиби или объясняющий подозрение.
5. **Отвлекающие версии:** минимум у 2 невиновных есть `red_herring`-факт или подозрительная тайна.
6. **Безопасность промпта:** ни один `shareableFactIds`, `coverStory`, `personality`, `sensitiveTopics`, `lie` не содержит имени виновного рядом со словами «убил/убийца/виновен» (простая эвристика) — защита от утечки в ИИ-контекст.
7. **Объём:** у каждого подозреваемого 6–10 `offlineQA`, 1–2 `breakpoints`; брифинг ≤ 150 слов; реплики ≤ 3 предложений.
8. **Картинки:** все файлы существуют, размеры и форматы соответствуют `05-art-bible.md`.

Валидатор выводит отчёт: ✅/❌ по каждому правилу + граф «что открывает что» в текстовом виде (для ручной проверки автором).
