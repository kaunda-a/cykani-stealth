// Real-world stealth validator
// Tests against sites with actual bot detection (not just checkers)

export class RealWorldTester {
  constructor() {
    this.results = [];
  }

  async testSite(pageOrSession, { name, url, checks = {} }) {
    const errors = [];
    const session = pageOrSession.page ? pageOrSession : null;
    const page = session?.page?.() || pageOrSession;

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Check for common bot detection signals
      const signals = await page.evaluate(() => ({
        // Cloudflare: shows "Checking your browser before accessing..."
        cloudflareChallenge: document.body.innerText.toLowerCase().includes('checking your browser') ||
          !!document.querySelector('[data-cf-settings], .cf-challenge'),

        // CAPTCHA presence
        captchaDetected: !!document.querySelector('iframe[src*="captcha"], iframe[src*="recaptcha"], [data-hcaptcha]'),

        // PerimeterX / DataDome
        pxBlocked: document.body.innerText.includes('PerimeterX') ||
          document.body.innerText.includes('DataDome') ||
          document.body.innerText.includes('_px') ||
          document.body.innerText.includes('_pxde'),

        // Access Denied
        accessDenied: document.title.includes('Access Denied') ||
          document.title.includes('Error') ||
          document.body.innerText.includes('Access Denied'),

        // JavaScript challenge
        jsChallenge: document.body.innerText.includes('Enable JavaScript') ||
          document.body.innerText.includes('please enable cookies'),

        // Custom checks
        ...checks,
      }));

      const passed = !signals.cloudflareChallenge &&
        !signals.captchaDetected &&
        !signals.pxBlocked &&
        !signals.accessDenied &&
        !signals.jsChallenge &&
        errors.length === 0;

      this.results.push({ name, url, passed, signals, errors });
      return { name, passed, signals, errors };
    } catch (err) {
      errors.push(err.message.slice(0, 100));
      this.results.push({ name, url, passed: false, signals: {}, errors });
      return { name, passed: false, signals: {}, errors };
    }
  }

  summary() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    return {
      score: total > 0 ? passed / total : 0,
      passed,
      total,
      results: this.results,
    };
  }
}

export async function quickSmokeTest(session) {
  const tester = new RealWorldTester();

  // Sites with known bot protection
  const tests = [
    { name: 'Cloudflare.com', url: 'https://www.cloudflare.com/' },
    { name: 'GitHub.com', url: 'https://github.com/' },
    { name: 'Google.com', url: 'https://www.google.com/' },
  ];

  const results = [];
  for (const t of tests) {
    results.push(await tester.testSite(session, t));
  }

  return tester.summary();
}