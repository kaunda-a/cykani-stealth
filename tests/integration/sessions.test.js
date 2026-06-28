import { describe, it, skip, assert, hasBinary } from '../harness.js';
import { createMaestro } from '../../src/index.js';

describe('Maestro session lifecycle', () => {
  if (!hasBinary()) {
    skip('should launch a browser session (skipped: no binary)', () => {});
    skip('should close a session cleanly (skipped: no binary)', () => {});
    skip('should handle concurrent sessions (skipped: no binary)', () => {});
    return;
  }

  let maestro;

  it('should create a maestro instance', () => {
    maestro = createMaestro();
    assert.ok(maestro);
    assert.ok(maestro.browsers instanceof Map);
  });

  it('should launch a browser session', async () => {
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    assert.ok(session.id);
    assert.ok(typeof session.goto === 'function');
    assert.ok(typeof session.click === 'function');
    assert.ok(typeof session.close === 'function');
    const page = session.page();
    assert.ok(page);
  });

  it('should navigate to a URL', async () => {
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    await session.goto('about:blank');
    const result = session.state();
    assert.ok(result);
    await session.close();
  });

  it('should close a session cleanly', async () => {
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    await session.close();
    const state = session.state();
    assert.equal(state, null);
  });

  it('should handle multiple concurrent sessions', async () => {
    const s1 = await maestro.launch({ fingerprint: 1, operate: { headless: true } });
    const s2 = await maestro.launch({ fingerprint: 2, operate: { headless: true } });
    assert.notEqual(s1.id, s2.id);
    assert.ok(s1.page());
    assert.ok(s2.page());
    await s1.close();
    await s2.close();
  });

  it('should close all sessions', async () => {
    await maestro.launch({ fingerprint: 1, operate: { headless: true } });
    await maestro.launch({ fingerprint: 2, operate: { headless: true } });
    await maestro.closeAll();
    assert.equal(maestro.browsers.size, 0);
  });
});
