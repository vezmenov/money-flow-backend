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

Запуск тестов с coverage (и порогами coverage из `jest.config.cjs`):
```bash
npm run test:cov
```

Watch режим:
```bash
npm run test:watch
```

## Правило перед коммитом
В репозитории включён `husky` pre-commit hook, который запускает `npm run check`.

Если `check` не проходит, коммит блокируется.

Важно: `npm run check` прогоняет тесты **с coverage** и падает, если coverage ниже порогов.

## Что покрыто
E2E тесты (через Nest Test + supertest, SQLite in-memory):
- основной контур `/api` защищён `x-api-key` (APP_API_KEY), поэтому в e2e запросах он всегда выставляется
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
- бэкапы:
  - `GET /api/backup/sqlite` отдаёт `.sqlite.gz` и требует `APP_API_KEY`
- security:
  - body limit: 1mb глобально, 5mb для OpenClaw import
- unit/integration:
  - нормализация/парсинг `utcOffset`
  - уникальность индекса `(source, idempotencyKey)` в БД
  - cron lock `job_locks`
  - backups service (VACUUM INTO / fallback copy / cleanup)
  - bootstrap (CORS parsing)
  - alerts (Telegram env / non-ok response / fetch errors)
  - smoke проверки, что OpenAPI спеки содержат нужные paths

Файлы тестов:
- `test/alerts.service.spec.ts`
- `test/recurring-expenses.e2e.spec.ts`
- `test/openclaw-import.e2e.spec.ts`
- `test/api-crud.e2e.spec.ts`
- `test/app-api-key.guard.e2e.spec.ts`
- `test/export-xlsx.e2e.spec.ts`
- `test/backup-sqlite.e2e.spec.ts`
- `test/body-limits.e2e.spec.ts`
- `test/health-ready.e2e.spec.ts`
- `test/backups.service.spec.ts`
- `test/backups.processor.spec.ts`
- `test/bootstrap.spec.ts`
- `test/job-locks.spec.ts`
- `test/money.spec.ts`
- `test/settings-utc-offset.spec.ts`
- `test/transaction-idempotency-index.spec.ts`
- `test/openapi-contract.spec.ts`
