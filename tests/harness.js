import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';

export { assert };

const SUITES = [];
let currentSuite = null;

export function describe(label, fn) {
  const prev = currentSuite;
  currentSuite = { label, tests: [], before: null, after: null };
  fn();
  SUITES.push(currentSuite);
  currentSuite = prev;
}

export function it(label, fn) {
  if (!currentSuite) throw new Error('it() must be called inside describe()');
  currentSuite.tests.push({ label, fn });
}

export function before(fn) {
  if (!currentSuite) throw new Error('before() must be called inside describe()');
  currentSuite.before = fn;
}

export function after(fn) {
  if (!currentSuite) throw new Error('after() must be called inside describe()');
  currentSuite.after = fn;
}

export function skip(label, fn) {
  if (!currentSuite) throw new Error('skip() must be called inside describe()');
  currentSuite.tests.push({ label, fn, skip: true });
}

// Detect if cykani-browser binary is available
export function hasBinary() {
  if (process.env.CYKANI_BINARY_PATH) {
    return existsSync(process.env.CYKANI_BINARY_PATH);
  }
  return false;
}

export async function run() {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  for (const suite of SUITES) {
    process.stdout.write(`\n  ${suite.label}\n`);
    if (suite.before) {
      try { await suite.before(); }
      catch (e) { throw new Error(`before() hook failed in "${suite.label}": ${e.message}`); }
    }
    for (const test of suite.tests) {
      if (test.skip) {
        process.stdout.write(`    ${'\u2713'} ${test.label} (skipped)\n`);
        skipped++;
        continue;
      }
      try {
        await test.fn();
        process.stdout.write(`    ${'\u2713'} ${test.label}\n`);
        passed++;
      } catch (e) {
        process.stdout.write(`    ${'\u2717'} ${test.label}\n`);
        failed++;
        errors.push({ suite: suite.label, test: test.label, error: e });
      }
    }
    if (suite.after) {
      try { await suite.after(); }
      catch (e) { /* best-effort cleanup */ }
    }
  }

  const total = passed + failed + skipped;
  process.stdout.write(`\n  Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)\n`);
  if (errors.length > 0) {
    for (const e of errors) {
      process.stdout.write(`\n  FAIL ${e.suite} > ${e.test}\n`);
      process.stdout.write(`    ${e.error.message}\n`);
      if (e.error.stack) {
        const stack = e.error.stack.split('\n').slice(1, 4).join('\n');
        process.stdout.write(`${stack}\n`);
      }
    }
  }
  return { passed, failed, skipped };
}
