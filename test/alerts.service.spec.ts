import { AlertsService } from '../src/alerts/alerts.service';
import { Logger } from '@nestjs/common';

describe('AlertsService', () => {
  const originalFetch = global.fetch;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it('does not call fetch when Telegram env is not configured', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const service = new AlertsService();
    await service.alert('hello');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends Telegram message when env is configured', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 't';
    process.env.TELEGRAM_CHAT_ID = 'c';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });
    global.fetch = fetchMock as any;

    const service = new AlertsService();
    await service.alert('boom');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];

    expect(url).toBe('https://api.telegram.org/bott/sendMessage');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'content-type': 'application/json' });

    const body = JSON.parse(opts.body);
    expect(body.chat_id).toBe('c');
    expect(body.text).toContain('[money-flow]');
    expect(body.text).toContain('boom');
  });

  it('swallows fetch errors', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 't';
    process.env.TELEGRAM_CHAT_ID = 'c';

    const fetchMock = jest.fn().mockRejectedValue(new Error('network'));
    global.fetch = fetchMock as any;

    const service = new AlertsService();
    await expect(service.alert('fail')).resolves.toBeUndefined();
  });

  it('logs and handles non-ok Telegram responses in non-test env', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TELEGRAM_BOT_TOKEN = 't';
    process.env.TELEGRAM_CHAT_ID = 'c';

    const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'nope',
    });
    global.fetch = fetchMock as any;

    const service = new AlertsService();
    await service.alert('boom');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[money-flow] boom'));
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Telegram alert failed'));
  });

  it('logs fetch errors in non-test env', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TELEGRAM_BOT_TOKEN = 't';
    process.env.TELEGRAM_CHAT_ID = 'c';

    const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const fetchMock = jest.fn().mockRejectedValue(new Error('network'));
    global.fetch = fetchMock as any;

    const service = new AlertsService();
    await service.alert('fail');

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Telegram alert error'));
  });
});
