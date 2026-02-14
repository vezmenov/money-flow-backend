# OpenClaw Agent API (v1)

Эта документация описывает внутренний контракт и реализацию агентского API для автозанесения трат.

## TL;DR
- Base URL: `/api/openclaw/v1`
- Auth: `x-api-key: <OPENCLAW_API_KEY>`
- Идемпотентность: уникальность обеспечивается парой `(source="openclaw", idempotencyKey)`

## Auth
Только API key на заголовке:
- `x-api-key` должен совпадать с `OPENCLAW_API_KEY` (env)
- Без ключа или с неверным ключом: `401`
- Если `OPENCLAW_API_KEY` не задан: `503` (misconfig)

Реализация: `src/openclaw/guards/openclaw-api-key.guard.ts`

## Эндпоинты
Спека: `openapi.openclaw.yaml`

### GET /health
Возвращает `{ "status": "ok" }` при валидном ключе.

### Категории (CRUD)
Категории общие для UI и агента.

#### GET /categories
Возвращает список категорий (для контекста агенту).

#### POST /categories
Создаёт категорию.

Request:
```json
{
  "name": "Subscriptions",
  "type": "expense",
  "color": "#22c55e"
}
```

Поля:
- `name` (обязательно)
- `type` (optional): `expense | income` (по умолчанию `expense`)
- `color` (optional): hex `#RRGGBB` (по умолчанию `#3b82f6`)

#### PUT /categories/:id
Обновляет категорию по `id`.

Request:
```json
{
  "name": "Subscriptions (paid)",
  "color": "#16a34a"
}
```

#### DELETE /categories/:id
Удаляет категорию по `id`.
Если в базе есть транзакции/регулярки, которые ссылаются на эту категорию, **сейчас удаление каскадное**:
- `Transaction.category -> Category` стоит `onDelete: 'CASCADE'` (удалятся транзакции)
- `RecurringExpense.category -> Category` стоит `onDelete: 'CASCADE'` (удалятся регулярки)

Если тебе надо другое поведение (например запрещать delete если категория используется) — скажи, сделаем.

### POST /transactions/import
Импорт/апсерт транзакций батчем.

Ответ: `200 OK`.

Request:
```json
{
  "transactions": [
    {
      "idempotencyKey": "openclaw:receipt:...",
      "amount": 123.45,
      "date": "2026-02-13",
      "categoryName": "Food",
      "description": "Store XYZ"
    }
  ]
}
```

Поведение:
- если транзакции с `(source="openclaw", idempotencyKey)` нет: создаём (`created`)
- если есть: обновляем (`updated`)
- `categoryName` резолвим в `Category.id`; если категории нет, создаём (с дефолтными `type/color`)

Response:
```json
{
  "results": [
    {
      "idempotencyKey": "openclaw:receipt:...",
      "action": "created",
      "transaction": { "...": "..." },
      "category": { "...": "..." }
    }
  ]
}
```

### GET /transactions/:idempotencyKey
Возвращает только импортированную агентом транзакцию (source=openclaw).

### DELETE /transactions/:idempotencyKey
Удаляет только импортированную агентом транзакцию (source=openclaw).

### Регулярные траты
OpenClaw также публикует управление регулярными тратами (monthly) под тем же префиксом:
- `GET /recurring-expenses?month=YYYY-MM`
- `POST /recurring-expenses`
- `DELETE /recurring-expenses/:id`

Важное отличие от импорта транзакций:
- категория задаётся **строго по `categoryId`** (если нет - ошибка), автосоздания по имени тут нет

Подробности: `docs/recurring-expenses.md`

## Данные / схема
Изменения в `Transaction`:
- добавлено `source` (default: `manual`)
- добавлено `idempotencyKey` (nullable)
- добавлен unique индекс `(source, idempotencyKey)`

Реализация: `src/transactions/transaction.entity.ts`

## Операционные заметки
- Если у вас уже есть SQLite база, TypeORM `synchronize: true` попытается добавить колонки/индексы автоматически.
- Рекомендуемый формат `idempotencyKey`: уже с неймспейсом, например `openclaw:receipt:<date>:<hash>`.
- В `GET/DELETE /transactions/:idempotencyKey` ключ должен быть URL-safe (или URL-encoded). Не используйте `/` внутри ключа.
