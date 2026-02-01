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

### CI/CD (GitHub Actions)
This repo includes a workflow that generates the SDK and uploads a tarball artifact.

1. Push changes to `openapi.yaml`.
2. Download the `money-flow-sdk` artifact from the workflow run.
3. Install it in the Angular repo:

```bash
npm install path/to/money-flow-sdk-*.tgz
```

### Auto-push to frontend repo
The workflow can also push the SDK directly into the Angular repo:

- Repo: `vezmenov/money-flow`
- Path: `src/app/sdk`

Add a `FRONTEND_TOKEN` secret (PAT with repo write access) to this backend repo.
When the workflow runs, it replaces `src/app/sdk` and pushes to `main`.

## Scripts
- `npm run start:dev` - start in watch mode
- `npm run build` - build to `dist/`
- `npm run start` - run built app
- `npm run lint` - lint codebase
- `npm run format` - format codebase
