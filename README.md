# Комната допросов (рабочее название)

Детективная игра для Android на **несколько игроков на одном телефоне** (hot-seat): игроки по очереди передают телефон, ведут собственное расследование, допрашивают подозреваемых и первыми пытаются назвать убийцу, мотив и способ.

- Допросы ведут ИИ-персонажи (через [aitunnel.ru](https://aitunnel.ru/), ключ пользователя), а без ключа и без сети игра проходится через заранее написанные вопросы.
- Новые дела выходят паками (JSON + картинки) и скачиваются без обновления приложения.
- Стек: Capacitor + React + TypeScript + Vite.

## Текущее состояние

M0 принят владельцем. Ветка `codex/m2-ai-interrogation` содержит классическую «Синюю сову» M1 и ИИ-допрос M2 с ключом пользователя, защищённым хранилищем и офлайн-вопросами. Автоматические проверки и APK 0.2.0 готовы. Реальные модели и хранение ключа на телефоне ещё требуют MT-004/010; приёмка M1 MT-009/003 также открыта. Арт временный; перед M3 работа остановлена. Подробности — в [STATUS](docs/STATUS.md), [HOWTO](docs/HOWTO-run.md) и [ручной очереди](docs/MANUAL-TEST-QUEUE.md).

Быстрый запуск: Node 24 LTS (минимум 22.12) → `npm ci` → `npm run dev`. API-ключ не нужен.

## Документация

| Документ | О чём |
|---|---|
| [AGENTS.md](AGENTS.md) | Правила для агента-разработчика (обязательно к прочтению) |
| [docs/00-overview.md](docs/00-overview.md) | Видение и границы проекта |
| [docs/01-game-design.md](docs/01-game-design.md) | Геймдизайн, экраны, правила |
| [docs/02-architecture.md](docs/02-architecture.md) | Архитектура и стек |
| [docs/03-case-schema.md](docs/03-case-schema.md) | Формат дела |
| [docs/04-ai-prompts.md](docs/04-ai-prompts.md) | Промпты LLM, защита от утечек |
| [docs/05-art-bible.md](docs/05-art-bible.md) | Стайл-гайд и промпты картинок |
| [docs/06-roadmap.md](docs/06-roadmap.md) | Этапы разработки и критерии готовности |
| [docs/07-testing.md](docs/07-testing.md) | Стратегия тестирования |
| [docs/08-content-pipeline.md](docs/08-content-pipeline.md) | Выпуск новых дел, серверы |
| [docs/cases/case-001-blue-owl.md](docs/cases/case-001-blue-owl.md) | Пилотное дело |
| [docs/STATUS.md](docs/STATUS.md) | Текущее состояние проекта |
| [docs/HOWTO-run.md](docs/HOWTO-run.md) | Как запустить и собрать |
| [docs/MANUAL-TEST-QUEUE.md](docs/MANUAL-TEST-QUEUE.md) | Что проверить на телефоне вручную |
| [docs/devlog/INDEX.md](docs/devlog/INDEX.md) | Журнал разработки |
