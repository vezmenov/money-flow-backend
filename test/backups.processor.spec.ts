import { BackupsProcessor } from '../src/backups/backups.processor';

describe('BackupsProcessor', () => {
  it('skips when lock is not acquired', async () => {
    const backupsService = { createSqliteGzipBackup: jest.fn() } as any;
    const jobLocksService = { acquire: jest.fn(async () => false) } as any;
    const alertsService = { alert: jest.fn() } as any;

    const p = new BackupsProcessor(backupsService, jobLocksService, alertsService);
    await p.tick();

    expect(backupsService.createSqliteGzipBackup).not.toHaveBeenCalled();
  });

  it('alerts when backup fails', async () => {
    const backupsService = {
      createSqliteGzipBackup: jest.fn(async () => {
        throw new Error('boom');
      }),
    } as any;
    const jobLocksService = { acquire: jest.fn(async () => true) } as any;
    const alertsService = { alert: jest.fn() } as any;

    const p = new BackupsProcessor(backupsService, jobLocksService, alertsService);
    await p.tick();

    expect(alertsService.alert).toHaveBeenCalledWith(
      expect.stringContaining('SQLite backup failed'),
    );
  });
});
