// Webhook — send diagnostics, alerts, and scan results to external endpoints
// Supports: Slack, Discord, Telegram, and generic HTTP webhooks

export class Webhook {
  constructor(opts = {}) {
    this.url = opts.url;
    this.type = opts.type ?? 'generic'; // slack, discord, telegram, generic
    this.headers = opts.headers ?? {};
    this.retryCount = opts.retryCount ?? 3;
    this.timeout = opts.timeout ?? 10000;
  }

  async send(payload) {
    const body = this._formatPayload(payload);
    for (let i = 0; i < this.retryCount; i++) {
      try {
        const res = await fetch(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this.headers },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeout),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json().catch(() => true);
      } catch (err) {
        if (i === this.retryCount - 1) throw err;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }

  _formatPayload(data) {
    const timestamp = new Date().toISOString();
    switch (this.type) {
      case 'slack':
        return {
          text: data.title ?? 'Cykani Alert',
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: data.title ?? 'Alert' } },
            { type: 'section', text: { type: 'mrkddown', text: '```json\n' + JSON.stringify(data, null, 2) + '\n```' } },
            { type: 'context', elements: [{ type: 'mrkddown', text: `*Timestamp:* ${timestamp}` }] },
          ],
        };
      case 'discord':
        return {
          embeds: [
            {
              title: data.title ?? 'Cykani Alert',
              description: '```json\n' + JSON.stringify(data.payload ?? data, null, 2).slice(0, 4000) + '\n```',
              color: data.color ?? 0x00ff00,
              timestamp,
            },
          ],
        };
      case 'telegram':
        return {
          chat_id: data.chatId,
          text: `<b>${data.title ?? 'Cykani'}</b>\n<pre>${JSON.stringify(data.payload ?? data, null, 2).slice(0, 4000)}</pre>`,
          parse_mode: 'HTML',
        };
      default:
        return { ...data, _sentAt: timestamp };
    }
  }
}

// Convenience factory for common webhook types
export function createSlackWebhook(url) {
  return new Webhook({ url, type: 'slack' });
}

export function createDiscordWebhook(url) {
  return new Webhook({ url, type: 'discord' });
}

export function createTelegramWebhook(token, chatId) {
  return new Webhook({
    url: `https://api.telegram.org/bot${token}/sendMessage`,
    type: 'telegram',
  });
}
