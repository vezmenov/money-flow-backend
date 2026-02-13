# Регулярные траты (monthly)

Регулярная трата - это шаблон, по которому система автоматически создаёт обычную транзакцию 1 раз в месяц.

## API
### Основной контур (`/api`)
- `GET /api/recurring-expenses?month=YYYY-MM`
- `POST /api/recurring-expenses`
- `DELETE /api/recurring-expenses/:id`

### OpenClaw контур (`/api/openclaw/v1`, требует `x-api-key`)
- `GET /api/openclaw/v1/recurring-expenses?month=YYYY-MM`
- `POST /api/openclaw/v1/recurring-expenses`
- `DELETE /api/openclaw/v1/recurring-expenses/:id`

Спека:
- `openapi.yaml`
- `openapi.openclaw.yaml`

## Создание регулярной траты
Request (`POST /recurring-expenses`):
- `categoryId` (uuid) - категория должна существовать
- `amount` (number)
- `dayOfMonth` (1..31)
- `date` (YYYY-MM-DD) - якорная дата старта; **день месяца в `date` должен совпадать с `dayOfMonth`**
- `description` (optional)

Правила:
- если `categoryId` не существует - возвращаем осмысленную ошибку (400)
- если `dayOfMonth != day(date)` - 400

## Список на месяц
`GET /recurring-expenses?month=YYYY-MM`

Возвращаем список объектов `RecurringExpenseForMonth`:
- поля регулярки (`id`, `categoryId`, `amount`, `dayOfMonth`, `date`, `description`)
- `scheduledDate` - дата, когда трата должна сработать в этом месяце
- `committed` - уже создана ли транзакция в этом месяце

Расчёт `scheduledDate`:
- `scheduledDay = min(dayOfMonth, lastDayOfMonth)`
- `scheduledDate = YYYY-MM-scheduledDay`
- если `scheduledDate < date` (регулярка ещё не стартовала) - в список **не включаем**

Расчёт `committed`:
- проверяем наличие транзакции с:
  - `source = "recurring"`
  - `idempotencyKey = "recurring:<recurringId>:<scheduledDate>"`

## Удаление
`DELETE /recurring-expenses/:id` удаляет только шаблон регулярки.

Важно: удаление регулярки **не влияет** на уже созданные/закоммиченные транзакции.

## Ежедневный парсер (фон)
Парсер запускается внутри backend через `@nestjs/schedule`:
- job срабатывает **каждые 5 минут** (по UTC)
- на каждом тике вычисляем “локальное время” пользователя через `utcOffset`
- если локальное время >= 23:55 - обрабатываем **сегодняшнюю** локальную дату
- иначе - обрабатываем **вчерашнюю** локальную дату

Надёжность / догонялка:
- в БД хранится `lastProcessedDate`
- если сервер лежал, то на следующем запуске обработаем диапазон дат до `maxDateToProcess`

Идемпотентность генерации транзакций:
- создаваемые транзакции имеют:
  - `source = "recurring"`
  - `idempotencyKey = "recurring:<recurringId>:<YYYY-MM-DD>"`
- за счёт уникального индекса `(source, idempotencyKey)` повторные прогоны не создают дублей
- генерация **create-only**: существующие транзакции не обновляем, чтобы не затирать ручные правки

## Таймзона (UTC offset)
Настройки храним в БД (single-user), дефолт: `+03:00`.

API:
- `GET /api/settings/timezone` -> `{ "utcOffset": "+03:00" }`
- `PUT /api/settings/timezone` -> `{ "utcOffset": "+03:00" }`

Input formats для `PUT`:
- `+03:00`, `-05:30`
- `UTC+3`, `UTC-5`

Нормализуем к формату `+HH:MM`.

Ограничения:
- это **offset**, а не IANA зона (DST не поддерживаем).
