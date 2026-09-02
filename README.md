# Etude CRM — etude-crm-app

CRM танцевальной студии на инфраструктуре GitHub: без сервера, без базы данных, без платного хостинга. Полная спецификация — в исходном ТЗ, приведена здесь только карта репозитория.

## Архитектура

Три репозитория, разделение обязательно (см. ТЗ §2):

| Репозиторий | Видимость | Содержимое | Кто пишет |
|---|---|---|---|
| **`etude-crm-app`** (этот репозиторий) | публичный | код фронта, ничего больше | разработчик |
| `etude-crm-data` | приватный | все JSON-данные | админы |
| `etude-crm-inbox` | приватный | черновики посещаемости | преподаватели |

Этот репозиторий никогда не содержит реальных данных — только код. Он собирается Actions'ом (`.github/workflows/deploy.yml`) и публикуется на GitHub Pages по адресу `crm.ristar.co`.

## Стек

React 18 + Vite + TypeScript, TanStack Router (file-based routing, `src/routes/`) + TanStack Query, Tailwind, Dexie (офлайн-очередь, подключается в Фазе 2), Zod (`src/schemas/`), Vitest (`src/domain/*.test.ts`).

## Структура

```
src/
  schemas/    Zod-схемы всех сущностей — зеркало ТЗ §3
  domain/     Бизнес-правила ТЗ §4 (баланс, начисления, скидки, зарплата) — чистые функции + тесты
  lib/github/ Contents API клиент с SHA-блокировкой (ТЗ §2.3)
  lib/auth/   Хранение PAT, роль (админ/преподаватель)
  routes/     Экраны — TanStack Router, файловая маршрутизация
```

## Разработка

```bash
npm install
npm run dev      # локальный сервер
npm run test      # Vitest — доменный слой
npm run build     # проверка типов + сборка
```

## Настройка окружения (`.env.local`)

Только для переопределения владельца/имён репозиториев данных, если они не под тем же аккаунтом:

```
VITE_GITHUB_OWNER=2MMisha
VITE_DATA_REPO=etude-crm-data
VITE_INBOX_REPO=etude-crm-inbox
```

## Ручной чек-лист: репозитории данных

Эта часть требует доступа к GitHub-аккаунту и не автоматизирована здесь.

1. Создать приватный репозиторий `etude-crm-data`.
2. Создать приватный репозиторий `etude-crm-inbox`.
3. В `etude-crm-data` создать fine-grained PAT для себя (админа): `Repository access` → только `etude-crm-data`, `Contents: Read and write`, срок жизни 90 дней.
4. Для каждого преподавателя — свой fine-grained PAT на `etude-crm-inbox` (`Contents: Read and write`) и свой PAT на `etude-crm-data` (`Contents: Read` — только для чтения своих групп/учеников).
5. Токены вводятся на экране входа приложения и хранятся в `localStorage` браузера — никогда не коммитятся.
6. Отзыв доступа = удаление токена в настройках GitHub (Settings → Developer settings → Fine-grained tokens).

Дальнейшие шаги (схемы JSON в `etude-crm-data`, воркфлоу `merge-attendance`/`validate`/`close-month`/`recalc-balances`/`backup`/`debtors`) — по мере прохождения Фаз 1–4, см. ТЗ §5, §7.
