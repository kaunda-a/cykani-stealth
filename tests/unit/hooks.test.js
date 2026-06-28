import { describe, it, assert } from '../harness.js';
import { Hooks } from '../../src/utils/hooks.js';

describe('Hooks', () => {
  it('should register and emit sync hooks', async () => {
    const h = new Hooks();
    let called = false;
    h.on('test:event', () => { called = true; });
    await h.emit('test:event', {});
    assert.ok(called);
  });

  it('should register and emit async hooks', async () => {
    const h = new Hooks();
    let called = false;
    h.on('test:async', async () => { called = true; });
    await h.emit('test:async', {});
    assert.ok(called);
  });

  it('should pass payload to handlers', async () => {
    const h = new Hooks();
    let payload = null;
    h.on('data', (p) => { payload = p; });
    await h.emit('data', { key: 'val' });
    assert.deepEqual(payload, { key: 'val' });
  });

  it('should return the payload from emit', async () => {
    const h = new Hooks();
    const result = await h.emit('evt', { x: 1 });
    assert.deepEqual(result, { x: 1 });
  });

  it('should not fail on handler errors', async () => {
    const h = new Hooks();
    h.on('err', () => { throw new Error('handler error'); });
    const result = await h.emit('err', {});
    assert.deepEqual(result, {});
  });

  it('should remove registered handlers', async () => {
    const h = new Hooks();
    let calls = 0;
    const fn = () => { calls++; };
    h.on('evt', fn);
    await h.emit('evt', {});
    h.off('evt', fn);
    await h.emit('evt', {});
    assert.equal(calls, 1);
  });

  it('should handle unregistered events gracefully', async () => {
    const h = new Hooks();
    const result = await h.emit('nonexistent', {});
    assert.deepEqual(result, {});
  });
});
