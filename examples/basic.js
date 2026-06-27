// Basic usage example
// Run with: CYKANI_BINARY_PATH=/path/to/chrome node examples/basic.js

import { launch } from '../src/index.js';

async function main() {
  const session = await launch({
    fingerprint: 7,
    platform: 'windows',
    instincts: {
      hesitation: 0.3,
      precision: 0.8,
      curiosity: 0.5,
    },
  });

  await session.goto('https://example.com');
  await session.wait(1000);
  await session.screenshot({ path: 'example.png' });

  console.log('Title:', session.result?.title);
  console.log('Session closed.');

  await session.close();
}

main().catch(console.error);