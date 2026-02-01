# Money Flow Backend

Base NestJS backend structure using current best practices.

## API
- `GET /health`
- `GET /categories`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`
- `GET /transactions`
- `POST /transactions`
- `PUT /transactions/:id`
- `DELETE /transactions/:id`

## Database
Uses SQLite at `data/database.sqlite` with TypeORM auto sync enabled for local development.

## Scripts
- `npm run start:dev` - start in watch mode
- `npm run build` - build to `dist/`
- `npm run start` - run built app
- `npm run lint` - lint codebase
- `npm run format` - format codebase
