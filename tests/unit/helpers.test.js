import { describe, it, assert } from '../harness.js';
import { sleep, rand, randInt, createSeededRng } from '../../src/utils/helpers.js';

describe('helpers', () => {
  it('sleep should resolve after at least the specified time', async () => {
    const start = Date.now();
    await sleep(50);
    assert.ok(Date.now() - start >= 40);
  });

  it('rand should return values within range', () => {
    for (let i = 0; i < 100; i++) {
      const val = rand(10, 20);
      assert.ok(val >= 10 && val <= 20, `rand() returned ${val}`);
    }
  });

  it('randInt should return integers within range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randInt(1, 6);
      assert.ok(Number.isInteger(val));
      assert.ok(val >= 1 && val <= 6);
    }
  });

  it('createSeededRng should produce deterministic sequences', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    for (let i = 0; i < 20; i++) {
      assert.equal(a(), b());
    }
  });

  it('createSeededRng should produce different sequences from different seeds', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(99);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    const same = seqA.every((v, i) => v === seqB[i]);
    assert.ok(!same);
  });

  it('createSeededRng should return values between 0 and 1', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 100; i++) {
      const val = rng();
      assert.ok(val >= 0 && val < 1, `rng() returned ${val}`);
    }
  });
});
