import { AlertsService } from '../src/alerts/alerts.service';

describe('AlertsService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
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
});
