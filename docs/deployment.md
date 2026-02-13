# Deployment

## Как деплоится backend
Деплой запускается GitHub Actions workflow `Deploy To Server` при пуше в ветку `main`.

Workflow: `/Users/slave/FettrCode/money-flow-backend/.github/workflows/deploy.yml`

На self-hosted раннере делается:
- синк репозиториев `money-flow`, `money-flow-backend`, `money-flow-infra`
- `docker compose up -d --build` в репозитории `money-flow-infra`

## Важно для OpenClaw
Для работы OpenClaw Agent API на окружении должно быть задано:
- `OPENCLAW_API_KEY` (секретный ключ, который будет проверяться по заголовку `x-api-key`)

Если `OPENCLAW_API_KEY` не задан, OpenClaw endpoints будут отвечать `503` (misconfig).

