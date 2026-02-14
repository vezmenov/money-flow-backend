import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request = require('supertest');
import { CategoriesModule } from '../src/categories/categories.module';
import { Category } from '../src/categories/category.entity';

describe('App API key guard (main /api)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.APP_API_KEY = 'appkey';

    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [Category],
        }),
        CategoriesModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    delete process.env.APP_API_KEY;
    await app.close();
  });

  it('returns 503 when APP_API_KEY is not configured', async () => {
    const saved = process.env.APP_API_KEY;
    delete process.env.APP_API_KEY;
    try {
      await request(app.getHttpServer()).get('/api/categories').expect(503);
    } finally {
      process.env.APP_API_KEY = saved;
    }
  });

  it('returns 401 on missing/wrong x-api-key', async () => {
    await request(app.getHttpServer()).get('/api/categories').expect(401);
    await request(app.getHttpServer()).get('/api/categories').set('x-api-key', 'wrong').expect(401);
  });
});
