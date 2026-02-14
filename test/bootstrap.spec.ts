import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../src/bootstrap';

function createAppStub(): INestApplication {
  return {
    setGlobalPrefix: jest.fn(),
    use: jest.fn(),
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn(),
    enableShutdownHooks: jest.fn(),
  } as any;
}

describe('bootstrap (configureApp)', () => {
  const savedCors = process.env.CORS_ORIGIN;

  afterEach(() => {
    if (savedCors === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = savedCors;
    }
  });

  it('enables CORS with a single origin string', () => {
    process.env.CORS_ORIGIN = 'https://example.com';
    const app = createAppStub();

    configureApp(app);

    expect((app as any).enableCors).toHaveBeenCalledWith({ origin: 'https://example.com' });
  });

  it('enables CORS with multiple origins array', () => {
    process.env.CORS_ORIGIN = 'https://a.com, https://b.com';
    const app = createAppStub();

    configureApp(app);

    expect((app as any).enableCors).toHaveBeenCalledWith({
      origin: ['https://a.com', 'https://b.com'],
    });
  });

  it('treats empty CORS list as disabled (origin=false)', () => {
    process.env.CORS_ORIGIN = ',';
    const app = createAppStub();

    configureApp(app);

    expect((app as any).enableCors).toHaveBeenCalledWith({ origin: false });
  });
});
