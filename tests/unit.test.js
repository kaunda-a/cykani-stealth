import { describe, run } from './harness.js';

// Import all unit test suites
await import('./unit/helpers.test.js');
await import('./unit/entity.test.js');
await import('./unit/stealth.test.js');
await import('./unit/cookies.test.js');
await import('./unit/pool.test.js');
await import('./unit/sentinel.test.js');
await import('./unit/hooks.test.js');
await import('./unit/validate.test.js');
await import('./unit/errors.test.js');
await import('./unit/strike.test.js');
await import('./unit/agents.test.js');
await import('./unit/cdpworld.test.js');

const { passed, failed } = await run();
process.exit(failed > 0 ? 1 : 0);
