# Deployment

## Как деплоится backend
Деплой запускается GitHub Actions workflow `Deploy To Server` при пуше в ветку `main`.

Workflow: `.github/workflows/deploy.yml`

Проверки (tests/docs/OpenAPI) гоняются:
- Workflow: `.github/workflows/ci.yml` (запускает `npm run check` на push/PR)
- И прямо в деплое: `.github/workflows/deploy.yml` сначала гоняет `npm run check`, и только потом делает `docker compose up`

На self-hosted раннере делается:
- синк репозиториев `money-flow`, `money-flow-backend`, `money-flow-infra`
- `docker compose up -d --build` в репозитории `money-flow-infra`

## Важно для OpenClaw
Для работы OpenClaw Agent API на окружении должно быть задано:
- `OPENCLAW_API_KEY` (секретный ключ, который будет проверяться по заголовку `x-api-key`)

Если `OPENCLAW_API_KEY` не задан, OpenClaw endpoints будут отвечать `503` (misconfig).

## Важно для основного API
Основной контур `/api/*` защищён `x-api-key` (single-user режим).

Нужно задать:
- `APP_API_KEY` (секретный ключ для UI/основного API)

Если `APP_API_KEY` не задан, основной API будет отвечать `503` (misconfig).

## База данных / миграции
SQLite база по умолчанию: `data/database.sqlite`.

Можно переопределить путь:
- `DB_PATH` (например `data/database.sqlite`)

Схема управляется миграциями (TypeORM), `synchronize: false`.

## Важно для регулярных трат
Парсер регулярных трат запускается внутри backend (schedule job) и создаёт транзакции автоматически.

Таймзона считается по настройке `utcOffset` в БД:
- дефолт: `+03:00`
- меняется через `PUT /api/settings/timezone`
