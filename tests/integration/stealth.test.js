import { describe, it, skip, assert, hasBinary } from '../harness.js';
import { createMaestro } from '../../src/index.js';
import { Diagnostic } from '../../src/agents/diagnostic.js';

describe('Stealth diagnostics', () => {
  if (!hasBinary()) {
    skip('should achieve high stealth score (skipped: no binary)', () => {});
    skip('should pass navigator.webdriver check (skipped: no binary)', () => {});
    skip('should have realistic plugins array (skipped: no binary)', () => {});
    return;
  }

  it('should achieve high stealth score', async () => {
    const maestro = createMaestro();
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    const page = session.page();
    const diag = new Diagnostic(page);
    await diag.runAll();
    const report = diag.report();
    assert.ok(report.score >= 0.8, `Stealth score ${report.score} below 0.8`);
    await session.close();
  });

  it('should not expose navigator.webdriver', async () => {
    const maestro = createMaestro();
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    const page = session.page();
    const webdriver = await page.evaluate(() => navigator.webdriver);
    assert.equal(webdriver, undefined);
    await session.close();
  });

  it('should have realistic plugins', async () => {
    const maestro = createMaestro();
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    const page = session.page();
    const plugins = await page.evaluate(() => {
      return { length: navigator.plugins.length, hasPDF: Array.from(navigator.plugins).some(p => p.name.includes('PDF')) };
    });
    assert.ok(plugins.length >= 3, 'Should have at least 3 plugins');
    assert.ok(plugins.hasPDF, 'Should include PDF plugin');
    await session.close();
  });

  it('should have consistent screen dimensions', async () => {
    const maestro = createMaestro();
    const session = await maestro.launch({
      fingerprint: 7,
      operate: { headless: true },
    });
    const page = session.page();
    const screen = await page.evaluate(() => ({
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }));
    const ratio = screen.width / screen.height;
    assert.ok(Math.abs(ratio - 16 / 9) < 0.2, `Screen ratio ${ratio} not 16:9`);
    await session.close();
  });
});
