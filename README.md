# Money Flow Backend

Base NestJS backend structure using current best practices.

## API
All routes are prefixed with `/api`.

- `GET /api/health`
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

## Database
Uses SQLite at `data/database.sqlite` with TypeORM auto sync enabled for local development.

## SDK (Angular)
Generate a TypeScript Angular SDK from `openapi.yaml`:

```bash
npm run sdk:generate
```

The generated SDK is placed in `sdk/` and can be copied into the Angular repo.

## Scripts
- `npm run start:dev` - start in watch mode
- `npm run build` - build to `dist/`
- `npm run start` - run built app
- `npm run lint` - lint codebase
- `npm run format` - format codebase
