// Observer — page monitoring, bot challenge detection, anomaly detection

export class Observer {
  constructor(page) {
    this.page = page;
    this.challenges = new Map();
    this.listeners = [];
  }

  async install() {
    await this.page.addInitScript(() => {
      window.__cykani__ = { challenges: [] };
      // Monitor for CAPTCHA iframes or widget injection
      const origAppend = document.body.appendChild.bind(document.body);
      document.body.appendChild = function(node) {
        if (node && node.tagName === 'IFRAME') {
          const src = node.src || '';
          if (src.includes('recaptcha') || src.includes('hcaptcha') || src.includes('turnstile')) {
            window.__cykani__.challenges.push({ type: 'captcha-iframe', src, ts: Date.now() });
          }
        }
        return origAppend(node);
      };
    });
  }

  async detectCaptcha() {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'iframe[src*="turnstile"]',
      'div[class*="g-recaptcha"]',
      'div[id*="rc-anchor"]',
      '#challenge-form',
      '.cf-turnstile',
    ];

    for (const sel of captchaSelectors) {
      try {
        if (await this.page.locator(sel).first().isVisible({ timeout: 2000 })) {
          return { detected: true, type: sel.includes('turnstile') ? 'turnstile' : sel.includes('hcaptcha') ? 'hcaptcha' : 'recaptcha', selector: sel };
        }
      } catch (_) {}
    }

    // JS-level challenge detection (Cloudflare, DataDome, PerimeterX)
    const challenge = await this.page.evaluate(() => {
      const indicators = [];
      if (document.title.includes('cloudflare') || document.body?.innerText?.includes('checking your browser')) indicators.push('cloudflare');
      if (document.title.includes('access denied') || document.body?.innerText?.includes('blocked')) indicators.push('generic-block');
      if (window.__cykani__?.challenges.length > 0) indicators.push(...window.__cykani__.challenges.map((c) => c.type));
      return indicators;
    }).catch(() => []);

    if (challenge.length > 0) {
      return { detected: true, type: challenge[0], indicators: challenge };
    }

    return { detected: false };
  }

  async watchFramerate(samples = 5, intervalMs = 200) {
    const rates = [];
    for (let i = 0; i < samples; i++) {
      const t0 = Date.now();
      await this.page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      rates.push(Date.now() - t0);
      if (i < samples - 1) await new Promise((r) => setTimeout(r, intervalMs));
    }
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    return { avgFrameTime: avg, suspicious: avg < 16 }; // < 16ms consistently = headless/virtualized
  }

  async collectArtifacts() {
    return {
      url: this.page.url(),
      title: await this.page.title().catch(() => ''),
      userAgent: await this.page.evaluate(() => navigator.userAgent).catch(() => ''),
      viewport: await this.page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })).catch(() => ({})),
      challenges: Array.from(this.challenges.values()),
    };
  }

  on(type, handler) {
    this.listeners.push({ type, handler });
  }

  emit(type, payload) {
    for (const { type: t, handler } of this.listeners) {
      if (t === type) handler(payload);
    }
  }
}
