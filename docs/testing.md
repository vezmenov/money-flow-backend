# Тестирование

## Как запускать
Установить зависимости:
```bash
npm install
```

Локальный quality gate (то что должно проходить всегда):
```bash
npm run check
```

Запуск тестов:
```bash
npm test
```

Watch режим:
```bash
npm run test:watch
```

## Правило перед коммитом
В репозитории включён `husky` pre-commit hook, который запускает `npm run check`.

Если `check` не проходит, коммит блокируется.

## Что покрыто
E2E тесты (через Nest Test + supertest, SQLite in-memory):
- настройки таймзоны:
  - `GET /api/settings/timezone` (дефолт `+03:00`)
  - `PUT /api/settings/timezone` (нормализация `UTC+3 -> +03:00`)
- регулярные траты:
  - create/list/delete
  - правило “31-е число” -> последний день месяца
- OpenClaw:
  - recurring endpoints требуют `x-api-key`
  - import transactions:
    - 503 если `OPENCLAW_API_KEY` не задан
    - 401 без ключа/с неверным ключом
    - upsert по `(source="openclaw", idempotencyKey)`
    - `GET/DELETE /api/openclaw/v1/transactions/:idempotencyKey`
    - валидация `idempotencyKey`/`categoryName` после `trim()`
    - `description` не затирается, если поле не прислали
    - `GET /api/openclaw/v1/categories` не плодит дубли (case-insensitive)
- основной API:
  - CRUD категорий
  - CRUD транзакций
  - базовые валидации (например, количество знаков после запятой в `amount`)
  - 404 на update/delete несуществующих сущностей
- парсер регулярных трат:
  - ручной вызов `processor.tick()` с зафиксированным временем
  - проверка что создаётся транзакция `source="recurring"` + корректный `idempotencyKey`
  - правило “31-е число” работает и для коммита в короткий месяц
  - догонялка по `lastProcessedDate` создаёт транзакции за пропущенные дни
  - удаление регулярки не удаляет уже созданную транзакцию
- экспорт данных:
  - `GET /api/export/xlsx` отдаёт `.xlsx` файл
  - 3 листа: `Transactions`, `Categories`, `Recurring`
- unit/integration:
  - нормализация/парсинг `utcOffset`
  - уникальность индекса `(source, idempotencyKey)` в БД
  - smoke проверки, что OpenAPI спеки содержат нужные paths

Файлы тестов:
- `test/recurring-expenses.e2e.spec.ts`
- `test/openclaw-import.e2e.spec.ts`
- `test/api-crud.e2e.spec.ts`
- `test/export-xlsx.e2e.spec.ts`
- `test/settings-utc-offset.spec.ts`
- `test/transaction-idempotency-index.spec.ts`
- `test/openapi-contract.spec.ts`
