import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  async alert(message: string): Promise<void> {
    const text = `[money-flow] ${message}`;

    // Always log locally (even if Telegram is not configured).
    if (process.env.NODE_ENV !== 'test') {
      this.logger.error(text);
    }

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!token || !chatId) {
      return;
    }

    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        if (process.env.NODE_ENV !== 'test') {
          this.logger.error(`Telegram alert failed: ${resp.status} ${body}`);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        this.logger.error(`Telegram alert error: ${String(err)}`);
      }
    }
  }
}
