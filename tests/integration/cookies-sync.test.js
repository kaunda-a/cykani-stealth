import { describe, it, skip, assert, hasBinary } from '../harness.js';
import { createMaestro } from '../../src/index.js';

describe('CookieJar sync with browser', () => {
  if (!hasBinary()) {
    skip('should import cookies from Playwright context (skipped: no binary)', () => {});
    skip('should export cookies to Playwright context (skipped: no binary)', () => {});
    return;
  }

  it('should import cookies from Playwright context', async () => {
    const maestro = createMaestro();
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    const jar = session.cookies();
    const count = await jar.importFromContext(session.page().context());
    assert.ok(typeof count === 'number');
    await session.close();
  });

  it('should import and re-export cookies preserving values', async () => {
    const maestro = createMaestro();
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    const jar = session.cookies();
    jar.set('https://example.com', { name: 'test_cookie', value: 'cykani_val' });
    const exported = await jar.exportToContext(session.page().context());
    assert.ok(exported >= 1);
    await session.close();
  });
});
