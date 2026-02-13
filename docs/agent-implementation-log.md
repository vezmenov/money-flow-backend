# Agent Implementation Log (OpenClaw)

Эта заметка фиксирует шаги, которые были сделаны при внедрении OpenClaw Agent API.

## Шаги
1. Добавлены поля и индекс в `Transaction`:
   - `source` (default: `manual`)
   - `idempotencyKey` (nullable)
   - unique индекс `(source, idempotencyKey)`
   Файл: `/Users/slave/FettrCode/money-flow-backend/src/transactions/transaction.entity.ts`

2. Обновлено создание обычных (ручных) транзакций, чтобы они явно помечались как `source="manual"`.
   Файл: `/Users/slave/FettrCode/money-flow-backend/src/transactions/transactions.service.ts`

3. Добавлен guard для проверки `x-api-key`:
   - ожидаемый ключ берётся из `OPENCLAW_API_KEY`
   - 401 при неверном ключе, 503 если ключ не сконфигурирован
   Файл: `/Users/slave/FettrCode/money-flow-backend/src/openclaw/guards/openclaw-api-key.guard.ts`

4. Добавлены DTO для импорта батчем и одной транзакции:
   - `OpenClawImportTransactionsDto`
   - `OpenClawUpsertTransactionDto`
   Файлы:
   - `/Users/slave/FettrCode/money-flow-backend/src/openclaw/dto/openclaw-import-transactions.dto.ts`
   - `/Users/slave/FettrCode/money-flow-backend/src/openclaw/dto/openclaw-upsert-transaction.dto.ts`

5. Реализована бизнес-логика upsert и автосоздания категорий:
   - поиск существующей транзакции по `(source="openclaw", idempotencyKey)`
   - create или update (upsert)
   - резолв категории по имени (case-insensitive), создание при отсутствии
   Файл: `/Users/slave/FettrCode/money-flow-backend/src/openclaw/openclaw.service.ts`

6. Добавлен контроллер `/openclaw/v1`:
   - `GET health`
   - `GET categories`
   - `POST transactions/import`
   - `GET/DELETE transactions/:idempotencyKey`
   Файл: `/Users/slave/FettrCode/money-flow-backend/src/openclaw/openclaw.controller.ts`

7. Добавлен модуль `OpenClawModule` и подключен в `AppModule`.
   Файлы:
   - `/Users/slave/FettrCode/money-flow-backend/src/openclaw/openclaw.module.ts`
   - `/Users/slave/FettrCode/money-flow-backend/src/app.module.ts`

8. Обновлена OpenAPI документация:
   - добавлены `source` и `idempotencyKey` в `Transaction` (frontend spec)
   - добавлен отдельный `openapi.openclaw.yaml`
   Файлы:
   - `/Users/slave/FettrCode/money-flow-backend/openapi.yaml`
   - `/Users/slave/FettrCode/money-flow-backend/openapi.openclaw.yaml`

9. Обновлён README с секцией OpenClaw API и примером curl.
   Файл: `/Users/slave/FettrCode/money-flow-backend/README.md`

10. Выравнен HTTP-код ответа импорта с контрактом (`200` вместо дефолтного `201` для POST).
    Файл: `/Users/slave/FettrCode/money-flow-backend/src/openclaw/openclaw.controller.ts`
