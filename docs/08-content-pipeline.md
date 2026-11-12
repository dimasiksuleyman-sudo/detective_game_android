# 08. Контент-пайплайн: новое дело раз в ~3 дня

## 1. Цикл одного дела

| День | Шаг | Кто | Инструмент |
|---|---|---|---|
| 1 | Концепции (B.1) → выбор → библия дела (B.2) → самопроверка (B.3) | владелец + сильная модель | сервер №2, `tools/generate-case.ts` (этап M5+, до этого — вручную в чате) |
| 1 | Валидатор, правки до ✅ | владелец (+ модель) | `npm run case:validate content/drafts/<id>/case.json` |
| 2 | Список картинок (B.4), генерация 15–20 картинок | владелец | ChatGPT, `05-art-bible.md` |
| 2 | Сборка, проверка хотспотов в редакторе S17 | владелец | `npm run case:build <id>` + debug-сборка |
| 3 | Тестовый прогон (Классика + ИИ), шлифовка текстов | владелец | debug-сборка |
| 3 | Публикация | владелец | `npm run case:publish <id>` |

Экономия на картинках: актёры из труппы и пул локаций переиспользуются. Новые на дело: 8–12 улик/крупных планов, 0–2 локации, 0–1 новый актёр, 2–4 кадра реконструкции, обложка.

## 2. Формат пака
```
case-002-xxx-v1.zip
├─ manifest.json
├─ case.json
├─ images/ (cover, locations, closeups, clues, reconstruction)
└─ troupe/ (только НОВЫЕ актёры: troupe/{actorId}/{emotion}.webp)
```

`manifest.json`:
```json
{
  "id": "case-002-xxx",
  "version": 1,
  "schemaVersion": 1,
  "minAppVersion": "1.0.0",
  "title": "…",
  "tagline": "…",
  "difficulty": 2,
  "estimatedMinutes": 35,
  "players": {"min": 1, "max": 4},
  "newActors": ["a17-…"],
  "requiresActors": ["a02-gleb", "a07-lida"],
  "sizeBytes": 7340032
}
```

## 3. Каталог (сервер №1)
`https://<server1>/packs/catalog.json`:
```json
{
  "catalogVersion": 1,
  "updatedAt": "2026-11-20T10:00:00Z",
  "packs": [
    {
      "id": "case-002-xxx",
      "version": 1,
      "title": "…",
      "tagline": "…",
      "coverUrl": "https://<server1>/packs/case-002-xxx/v1/cover.webp",
      "zipUrl": "https://<server1>/packs/case-002-xxx/v1/pack.zip",
      "sha256": "…",
      "sizeBytes": 7340032,
      "minAppVersion": "1.0.0",
      "publishedAt": "2026-11-20T10:00:00Z",
      "requiresActors": ["a02-gleb"],
      "free": true
    }
  ]
}
```
Поле `free` — задел под подписку (в v1.0 все `true`). Адрес сервера — в конфиге приложения (`src/content/config.ts`), владелец сообщит домен.

## 4. Сервер №1 (раздача)
- nginx, HTTPS (Let's Encrypt), каталог `/var/www/packs/`.
- `catalog.json`: `Cache-Control: max-age=300`; `pack.zip`, `cover.webp`: `Cache-Control: public, max-age=31536000, immutable` (версия в пути).
- `Access-Control-Allow-Origin: *` на GET.
- Конфиг — `server/nginx/packs.conf`, инструкция по установке — `docs/HOWTO-run.md` → «Сервер».

## 5. Сервер №2 (производство)
- Node LTS, клон репозитория, `.env` с ключом aitunnel **владельца** (только на сервере).
- Скрипты `tools/*`: генерация черновиков, валидация, сборка паков, публикация на сервер №1 по `rsync` через SSH-ключ.
- Черновики — `content/drafts/` (вне git или в отдельном приватном репозитории — решает владелец).

## 6. Стоимость (ориентир, ноябрь 2026, цены aitunnel перепроверять)
- Генерация текста дела сильной моделью (3–5 итераций): ~50–200 ₽.
- Одна партия на дешёвой модели (≈60 реплик, ≈150 тыс. токенов вход / 12 тыс. выход): ~0,5–3 ₽ — платит игрок своим ключом.
- Картинки: в рамках подписки ChatGPT или поштучно по тарифу API.

## Подготовленная озвучка пилота (до M5)

Встроенный пилот содержит audio/*.mp3 и audio/manifest.json по ADR-018. Источники текстов — content/narration/plan.json, ручная генерация — tools/generate-narration.py; tools/prepare-narration.py проверяет текст/голос/хеши, кодирует MP3 и создаёт sidecar. При изменении текста устаревшая запись в UI скрывается. Генерация не выполняется при npm test/e2e/build. Включение аудио в скачиваемый пак, его manifest и проверка размера/целостности будут согласованы в M5; текущая ZIP-сборка ещё не реализована.
