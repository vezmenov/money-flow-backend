# Тестирование

## Как запускать
Установить зависимости:
```bash
npm install
```

Запуск тестов:
```bash
npm test
```

Watch режим:
```bash
npm run test:watch
```

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
- парсер регулярных трат:
  - ручной вызов `processor.tick()` с зафиксированным временем
  - проверка что создаётся транзакция `source="recurring"` + корректный `idempotencyKey`
  - удаление регулярки не удаляет уже созданную транзакцию

Файл тестов:
- `/Users/slave/FettrCode/money-flow-backend/test/recurring-expenses.e2e.spec.ts`

