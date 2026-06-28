import { describe, it, assert } from '../harness.js';
import { Poolize } from '../../src/utils/poolize.js';

describe('Poolize', () => {
  it('should rotate proxies round-robin', () => {
    const pool = new Poolize({ proxies: ['p1', 'p2', 'p3'] });
    assert.equal(pool.getNextProxy(), 'p1');
    assert.equal(pool.getNextProxy(), 'p2');
    assert.equal(pool.getNextProxy(), 'p3');
    assert.equal(pool.getNextProxy(), 'p1');
  });

  it('should return undefined when no proxies', () => {
    const pool = new Poolize();
    assert.equal(pool.getNextProxy(), undefined);
  });

  it('should register and unregister sessions', () => {
    const pool = new Poolize();
    pool.register('s1', { id: 's1' });
    assert.equal(pool.getHealthySessions().length, 1);
    pool.unregister('s1');
    assert.equal(pool.getHealthySessions().length, 0);
  });

  it('should mark sessions as broken', () => {
    const pool = new Poolize({ autoRecover: false });
    pool.register('s1', { id: 's1' });
    pool.markBroken('s1', 'connection lost');
    assert.equal(pool.getHealthySessions().length, 0);
  });

  it('should track proxy failures', () => {
    const pool = new Poolize({ maxFailures: 2 });
    pool.addProxy('p1');
    pool.recordFailure('p1');
    pool.recordFailure('p1');
    const health = pool._getProxyHealth('p1');
    assert.equal(health, 0);
  });

  it('should track proxy successes', () => {
    const pool = new Poolize();
    pool.addProxy('p1');
    pool.recordSuccess('p1');
    pool.recordSuccess('p1');
    const health = pool._getProxyHealth('p1');
    assert.equal(health, 1);
  });

  it('should use factory for recovery', () => {
    let recovered = false;
    const pool = new Poolize({
      autoRecover: false,
      factory: async (id) => { recovered = true; return { id }; },
    });
    pool.register('s1', { id: 's1' });
    const result = pool._recoverSession('s1');
    assert.ok(result !== null);
  });

  it('should drain all sessions', async () => {
    let closed = 0;
    const pool = new Poolize({ autoRecover: false });
    pool.register('s1', { close: async () => { closed++; } });
    pool.register('s2', { close: async () => { closed++; } });
    await pool.drain(1000);
    assert.equal(closed, 2);
    assert.equal(pool.getHealthySessions().length, 0);
  });

  it('should support random rotation strategy', () => {
    const pool = new Poolize({ proxies: ['p1', 'p2', 'p3'], rotationStrategy: 'random' });
    const results = new Set();
    for (let i = 0; i < 20; i++) results.add(pool.getNextProxy());
    assert.ok(results.size > 0);
  });
});
