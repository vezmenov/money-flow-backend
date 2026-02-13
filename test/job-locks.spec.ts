import { DataSource } from 'typeorm';
import { JobLock } from '../src/job-locks/job-lock.entity';
import { JobLocksService } from '../src/job-locks/job-locks.service';

describe('JobLocksService', () => {
  let dataSource: DataSource;
  let service: JobLocksService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
      entities: [JobLock],
    });
    await dataSource.initialize();
    service = new JobLocksService(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  it('only one concurrent acquire should succeed', async () => {
    const [a, b] = await Promise.all([
      service.acquire('recurring-expenses', 60_000),
      service.acquire('recurring-expenses', 60_000),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it('rejects empty lock names', async () => {
    await expect(service.acquire('   ', 60_000)).rejects.toThrow('Job lock name must be non-empty');
  });
});
