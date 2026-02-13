# Экспорт данных (XLSX)

Backend умеет выгружать данные в Excel (`.xlsx`) одним файлом.

## API
`GET /api/export/xlsx`

Ответ:
- `200 OK`
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="money-flow-export.xlsx"`

## Структура файла
В файле 3 листа:

### 1) `Transactions`
Колонки:
- `id`
- `source`
- `idempotencyKey`
- `date` (YYYY-MM-DD)
- `amount`
- `categoryId`
- `categoryName`
- `description`

### 2) `Categories`
Колонки:
- `id`
- `name`

### 3) `Recurring`
Колонки:
- `id`
- `categoryId`
- `categoryName`
- `amount`
- `dayOfMonth`
- `date` (YYYY-MM-DD)
- `description`

## Реализация
- Endpoint: `src/exports/exports.controller.ts`
- Генератор XLSX: `src/exports/exports.service.ts`

