import { describe, it, assert } from '../harness.js';
import { Sentinel } from '../../src/core/sentinel.js';

describe('Sentinel', () => {
  it('should start in CLOSED state', () => {
    const s = new Sentinel();
    assert.equal(s.state, 'CLOSED');
  });

  it('should execute a successful function', async () => {
    const s = new Sentinel();
    const result = await s.execute(async () => 'ok', 'test');
    assert.equal(result, 'ok');
  });

  it('should retry on failure', async () => {
    const s = new Sentinel({ maxRetries: 3, baseDelay: 10 });
    let attempts = 0;
    await assert.rejects(
      () => s.execute(async () => { attempts++; throw new Error('fail'); }, 'test'),
      /fail/
    );
    assert.equal(attempts, 3);
  });

  it('should open circuit after threshold failures', async () => {
    const s = new Sentinel({ maxRetries: 1, circuitBreakerThreshold: 2, baseDelay: 5 });
    await s.execute(async () => { throw new Error('fail'); }, 't1').catch(() => {});
    await s.execute(async () => { throw new Error('fail'); }, 't2').catch(() => {});
    assert.equal(s.state, 'OPEN');
  });

  it('should reject when circuit is OPEN', async () => {
    const s = new Sentinel({ maxRetries: 1, circuitBreakerThreshold: 1, baseDelay: 5 });
    s.lastFailureTime = Date.now();
    s.failures = 5;
    s.state = 'OPEN';
    await assert.rejects(
      () => s.execute(async () => 'ok', 'test'),
      /Circuit breaker OPEN/
    );
  });

  it('should recover to CLOSED on success', async () => {
    const s = new Sentinel({ maxRetries: 2, circuitBreakerThreshold: 5, baseDelay: 5 });
    let fail = true;
    await s.execute(async () => { if (fail) { fail = false; throw new Error('fail'); } return 'ok'; }, 'test');
    assert.equal(s.state, 'CLOSED');
  });

  it('should report health metrics', async () => {
    const s = new Sentinel({ maxRetries: 1, circuitBreakerThreshold: 5 });
    await s.execute(async () => 'ok', 'test');
    const health = s.getHealth();
    assert.equal(health.state, 'CLOSED');
    assert.equal(health.successRate, 1);
    assert.ok(health.recentOperations >= 0);
  });

  it('should handle getHealth with no metrics', () => {
    const s = new Sentinel();
    const health = s.getHealth();
    assert.equal(health.successRate, 1);
    assert.equal(health.recentOperations, 0);
    assert.equal(health.avgDuration, 0);
  });

  it('should use exponential backoff with jitter', async () => {
    const s = new Sentinel({ maxRetries: 1, baseDelay: 50 });
    const start = Date.now();
    await s._delay(3);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 25, `Delay too short: ${elapsed}ms`);
  });
});
