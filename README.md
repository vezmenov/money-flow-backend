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

## OpenClaw Agent API
All routes are prefixed with `/api/openclaw/v1` and require `x-api-key`.

Env:
- `OPENCLAW_API_KEY` - shared secret for agent access

Routes:
- `GET /api/openclaw/v1/health`
- `GET /api/openclaw/v1/categories`
- `POST /api/openclaw/v1/transactions/import`
- `GET /api/openclaw/v1/transactions/:idempotencyKey`
- `DELETE /api/openclaw/v1/transactions/:idempotencyKey`

Spec:
- Frontend: `openapi.yaml`
- OpenClaw: `openapi.openclaw.yaml`

Example import:
```bash
curl -X POST "http://localhost:3000/api/openclaw/v1/transactions/import" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $OPENCLAW_API_KEY" \
  -d '{
    "transactions": [
      {
        "idempotencyKey": "openclaw:receipt:2026-02-13:abc123",
        "amount": 123.45,
        "date": "2026-02-13",
        "categoryName": "Food",
        "description": "Store XYZ"
      }
    ]
  }'
```

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
