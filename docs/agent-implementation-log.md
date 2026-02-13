# Agent Implementation Log (OpenClaw)

Эта заметка фиксирует шаги, которые были сделаны при внедрении OpenClaw Agent API.

## Шаги
1. Добавлены поля и индекс в `Transaction`:
   - `source` (default: `manual`)
   - `idempotencyKey` (nullable)
   - unique индекс `(source, idempotencyKey)`
   Файл: `src/transactions/transaction.entity.ts`

2. Обновлено создание обычных (ручных) транзакций, чтобы они явно помечались как `source="manual"`.
   Файл: `src/transactions/transactions.service.ts`

3. Добавлен guard для проверки `x-api-key`:
   - ожидаемый ключ берётся из `OPENCLAW_API_KEY`
   - 401 при неверном ключе, 503 если ключ не сконфигурирован
   Файл: `src/openclaw/guards/openclaw-api-key.guard.ts`

4. Добавлены DTO для импорта батчем и одной транзакции:
   - `OpenClawImportTransactionsDto`
   - `OpenClawUpsertTransactionDto`
   Файлы:
   - `src/openclaw/dto/openclaw-import-transactions.dto.ts`
   - `src/openclaw/dto/openclaw-upsert-transaction.dto.ts`

5. Реализована бизнес-логика upsert и автосоздания категорий:
   - поиск существующей транзакции по `(source="openclaw", idempotencyKey)`
   - create или update (upsert)
   - резолв категории по имени (case-insensitive), создание при отсутствии
   Файл: `src/openclaw/openclaw.service.ts`

6. Добавлен контроллер `/openclaw/v1`:
   - `GET health`
   - `GET categories`
   - `POST transactions/import`
   - `GET/DELETE transactions/:idempotencyKey`
   Файл: `src/openclaw/openclaw.controller.ts`

7. Добавлен модуль `OpenClawModule` и подключен в `AppModule`.
   Файлы:
   - `src/openclaw/openclaw.module.ts`
   - `src/app.module.ts`

8. Обновлена OpenAPI документация:
   - добавлены `source` и `idempotencyKey` в `Transaction` (frontend spec)
   - добавлен отдельный `openapi.openclaw.yaml`
   Файлы:
   - `openapi.yaml`
   - `openapi.openclaw.yaml`

9. Обновлён README с секцией OpenClaw API и примером curl.
   Файл: `README.md`

10. Выравнен HTTP-код ответа импорта с контрактом (`200` вместо дефолтного `201` для POST).
    Файл: `src/openclaw/openclaw.controller.ts`

11. Деплой делается пушем в `main` (GitHub Actions workflow на self-hosted раннере).
    Док: `docs/deployment.md`

12. Добавлены настройки таймзоны (UTC offset) в БД + API:
    - `GET/PUT /api/settings/timezone`
    Файлы:
    - `src/settings/settings.entity.ts`
    - `src/settings/settings.service.ts`
    - `src/settings/settings.controller.ts`
    - `src/settings/settings.module.ts`

13. Добавлены регулярные траты (monthly) + API:
    - основной контур: `/api/recurring-expenses`
    - OpenClaw контур: `/api/openclaw/v1/recurring-expenses`
    Файлы:
    - `src/recurring-expenses/recurring-expense.entity.ts`
    - `src/recurring-expenses/recurring-expenses.service.ts`
    - `src/recurring-expenses/recurring-expenses.controller.ts`
    - `src/recurring-expenses/recurring-expenses.module.ts`

14. Добавлен фоновый парсер регулярных трат (schedule job) с догонялкой:
    - state: `lastProcessedDate`
    - запуск каждые 5 минут, “конец дня” 23:55 по utcOffset
    - генерация транзакций `source="recurring"` + idempotencyKey
    Файлы:
    - `src/recurring-expenses/recurring-processing-state.entity.ts`
    - `src/recurring-expenses/recurring-expenses.processor.ts`

15. Обновлена OpenAPI документация и внутренний док по регуляркам.
    Файлы:
    - `openapi.yaml`
    - `openapi.openclaw.yaml`
    - `docs/recurring-expenses.md`

16. Добавлена базовая тестовая инфраструктура (Jest + ts-jest + supertest) и e2e-тесты для timezone/recurring/OpenClaw.
    Файлы:
    - `jest.config.cjs`
    - `tsconfig.spec.json`
    - `test/recurring-expenses.e2e.spec.ts`
    - `docs/testing.md`

17. Расширено покрытие e2e тестами:
    - OpenClaw import/upsert транзакций (`idempotencyKey`, GET/DELETE by key)
    - CRUD категорий и транзакций в основном API
    Файлы:
    - `test/openclaw-import.e2e.spec.ts`
    - `test/api-crud.e2e.spec.ts`

18. Добавлены quality gates:
    - `npm run check`: format-check + lint + build + tests + OpenAPI validate + docs check
    - pre-commit hook (husky) блокирует коммит, если `check` не проходит
    - CI workflow гоняет `check` на push/PR
    Файлы:
    - `.husky/pre-commit`
    - `scripts/validate-openapi.cjs`
    - `scripts/check-docs.cjs`
    - `.github/workflows/ci.yml`
    - `package.json`

19. Усилены e2e тесты edge-case сценариями (валидации/404/догонялка парсера).
    Файлы:
    - `test/recurring-expenses.e2e.spec.ts`
    - `test/openclaw-import.e2e.spec.ts`
    - `test/api-crud.e2e.spec.ts`

20. Добавлены unit/integration/contract тесты:
    - unit: нормализация/парсинг `utcOffset`
    - integration: уникальный индекс `(source, idempotencyKey)` на SQLite
    - contract: OpenAPI спеки содержат ключевые paths/схемы
    Файлы:
    - `test/settings-utc-offset.spec.ts`
    - `test/transaction-idempotency-index.spec.ts`
    - `test/openapi-contract.spec.ts`

21. Добавлен экспорт данных в XLSX:
    - `GET /api/export/xlsx` возвращает `.xlsx` файл для скачивания
    - 3 листа: `Transactions`, `Categories`, `Recurring`
    Файлы:
    - `src/exports/exports.controller.ts`
    - `src/exports/exports.service.ts`
    - `src/exports/exports.module.ts`
    - `src/app.module.ts`
    - `openapi.yaml`
    - `docs/export-xlsx.md`

22. Основной контур `/api` защищён API key:
    - новый `APP_API_KEY` (env)
    - проверка по заголовку `x-api-key`
    - `/api/health` остаётся публичным (без ключа)
    Файлы:
    - `src/auth/app-api-key.guard.ts`
    - `src/categories/categories.controller.ts`
    - `src/transactions/transactions.controller.ts`
    - `src/settings/settings.controller.ts`
    - `src/recurring-expenses/recurring-expenses.controller.ts`
    - `src/exports/exports.controller.ts`
    - `openapi.yaml`
    - `docs/deployment.md`
