// Example: Captcha + Webhook + Proxy rotation
import { launch, CaptchaSolver, createDiscordWebhook, ProxyManager } from 'cykani-stealth';

const DISCORD_URL = 'https://discord.com/api/webhooks/...';
const CAPSOLVER_KEY = 'CAP-...';

async function main() {
  // Setup captcha solver
  const captcha = new CaptchaSolver({ apiKey: CAPSOLVER_KEY, service: 'capsolver' });

  // Setup proxy rotation
  const proxyManager = new ProxyManager({ maxFailures: 3, cooldownMs: 30000 });
  proxyManager.addProxy('http://us-proxy1:3128');
  proxyManager.addProxy('http://us-proxy2:3128');
  proxyManager.addProxy('http://uk-proxy1:3128');

  // Launch browser with rotated proxy
  const proxy = proxyManager.getNext();
  const session = await launch({
    fingerprint: 7,
    proxy,
  });

  const page = await session.page();
  await page.goto('https://example.com/captcha-page');

  // Solve captcha if present
  const siteKey = await page.evaluate(() =>
    document.querySelector('[data-sitekey]')?.dataset.sitekey
  );
  if (siteKey) {
    const result = await captcha.solveRecaptchaV2({ siteKey, pageUrl: page.url() });
    await page.evaluate((t) => {
      document.querySelector('[name="g-recaptcha-response"]').value = t;
    }, result.token);
  }

  // Send diagnostic to Discord
  const webhook = createDiscordWebhook(DISCORD_URL);
  await webhook.send({
    title: 'Cykani Session Complete',
    payload: { proxy, url: page.url(), captchaSolved: !!siteKey },
    color: 0x00ff00,
  });

  await session.close();
}

main().catch(console.error);
