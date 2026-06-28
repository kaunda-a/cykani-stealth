import { describe, skip, run } from './harness.js';

// Mock-based integration tests (no playwright-core required)
await import('./integration/mock-maestro.test.js');

let hasPlaywright = true;
try {
  await import('./integration/sessions.test.js');
  await import('./integration/stealth.test.js');
  await import('./integration/cookies-sync.test.js');
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message?.includes('Cannot find package')) {
    hasPlaywright = false;
  } else {
    throw e;
  }
}

if (!hasPlaywright) {
  describe('Integration tests', () => {
    skip('skipped: playwright-core not installed', () => {});
    skip('install with: npm install playwright-core', () => {});
  });
}

const { passed, failed } = await run();
process.exit(failed > 0 ? 1 : 0);
