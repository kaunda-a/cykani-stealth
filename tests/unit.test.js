// Unit tests for cykani-stealth core modules
// Run with: node --test tests/unit.test.js or npm test

import { strict as assert } from 'node:assert';
import { EntityBrain } from '../src/brain/entity.js';
import { Choreographer } from '../src/core/choreographer.js';

// Mock page for unit testing
const createMockPage = () => ({
  addInitScript: () => Promise.resolve(),
  evaluate: () => Promise.resolve({}),
  waitForSelector: () => Promise.resolve(),
  locator: () => ({
    first: () => ({
      boundingBox: () => Promise.resolve({ x: 100, y: 100, width: 50, height: 20 }),
    }),
  }),
  goto: () => Promise.resolve({}),
  mouse: { move: () => Promise.resolve(), down: () => Promise.resolve(), up: () => Promise.resolve() },
  keyboard: { press: () => Promise.resolve() },
});

// EntityBrain tests
Deno.test || (function() {
  console.log('Running unit tests...');

  // Test typing delay range
  const brain = new EntityBrain({ instincts: { hesitation: 0.5 } });
  const delay = brain.getTypingDelay();
  assert(delay >= 10 && delay <= 200, 'Typing delay should be in realistic range');
  console.log('Typing delay:', delay, 'ms');

  // Test mouse curve generation
  const curve = brain.getMouseCurve({ x: 0, y: 0 }, { x: 100, y: 100 });
  assert(curve.length > 0, 'Mouse curve should have points');
  assert(curve[0].x === 0 || curve[0].y === 0, 'Curve should start at origin');
  console.log('Mouse curve steps:', curve.length);

  // Test args generation
  const args = brain.getArgs();
  assert(args.includes('--fingerprint='), 'Should include fingerprint arg');
  assert(args.includes('--ignore-gpu-blocklist') || args.includes('--fingerprint-platform='), 'Should include stealth args');
  console.log('Args count:', args.length);

  console.log('All unit tests passed.');
})();