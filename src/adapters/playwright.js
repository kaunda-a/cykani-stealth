// Playwright adapter — thin compatibility layer
// Allows drop-in replacement: replace `import { chromium } from 'playwright-core'`
// with `import { chromium } from 'cykani-stealth/adapters/playwright'`

import { Maestro } from '../core/maestro.js';

export const chromium = {
  async launch(options = {}) {
    const maestro = new Maestro();
    const session = await maestro.launch(options.entity ?? {});
    return {
      ...session,
      newPage: async () => ({ goto: session.goto, click: session.click, type: session.type, screenshot: session.screenshot, close: async () => {} }),
      pages: () => [session],
      close: () => session.close(),
      isConnected: () => true,
    };
  },
};
