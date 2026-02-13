# Backups (SQLite)

Проект single-user, но проебать базу из-за одного кривого деплоя очень легко, поэтому бэкапы делаем обязательно.

## Переменные окружения
- `DB_PATH` (default: `data/database.sqlite`)
- `BACKUP_DIR` (default: `data/backups`)
- `BACKUP_RETENTION_DAYS` (default: `30`)

## Автобэкап (cron)
В фоне запускается job, который 1 раз в день делает gzip-бэкап SQLite в `BACKUP_DIR` и чистит старые файлы по ретеншну.

Реализация: `src/backups/backups.processor.ts`

## Ручной бэкап через API
`GET /api/backup/sqlite` (нужен `x-api-key`, т.е. `APP_API_KEY`)

Ответ: `.sqlite.gz` файл на скачивание.

## Восстановление (ручное)
1. Остановить сервис.
2. Взять файл бэкапа (`.sqlite.gz`) из `BACKUP_DIR` или скачать через API.
3. Распаковать:
   - `gunzip -c money-flow-backup-....sqlite.gz > restored.sqlite`
4. Заменить файл базы по пути `DB_PATH` на `restored.sqlite` (перед заменой лучше сделать копию текущего файла).
5. Запустить сервис.

