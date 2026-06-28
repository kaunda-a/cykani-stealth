import { describe, it, assert } from '../harness.js';

describe('CdpWorld', () => {
  it('constructor accepts page and sets up state', async () => {
    const { CdpWorld } = await import('../../src/humor/cdpworld.js');
    const page = { context: () => ({ newCDPSession: async () => null }) };
    const w = new CdpWorld(page);
    assert(typeof w.evaluate === 'function', 'evaluate is a function');
    assert(typeof w.invalidate === 'function', 'invalidate is a function');
    assert(typeof w.destroy === 'function', 'destroy is a function');
  });

  it('falls back to page.evaluate when CDP session unavailable', async () => {
    const { CdpWorld } = await import('../../src/humor/cdpworld.js');
    let evaluateCalled = false;
    const page = {
      context: () => ({ newCDPSession: async () => { throw new Error('no session'); } }),
      evaluate: async () => { evaluateCalled = true; return 'fallback'; },
    };
    const w = new CdpWorld(page);
    const result = await w.evaluate(() => 'test');
    assert(evaluateCalled === true, 'should fall back to page.evaluate');
    assert(result === 'fallback', 'should return fallback result');
  });

  it('invalidate resets CDP context', async () => {
    const { CdpWorld } = await import('../../src/humor/cdpworld.js');
    const w = new CdpWorld({ context: () => ({ newCDPSession: async () => null }) });
    w._valid = true;
    w._contextId = 42;
    w.invalidate();
    assert(w._valid === false, 'invalidated after call');
    assert(w._contextId === null, 'contextId cleared after invalidation');
  });

  it('destroy cleans up CDP session', async () => {
    const { CdpWorld } = await import('../../src/humor/cdpworld.js');
    let detached = false;
    const session = { detach: async () => { detached = true; }, on: () => {} };
    const page = { context: () => ({ newCDPSession: async () => session }) };
    const w = new CdpWorld(page);
    w._session = session;
    w._valid = true;
    w._contextId = 42;
    await w.destroy();
    assert(w._session === null, 'session cleared after destroy');
    assert(w._valid === false, 'valid cleared after destroy');
    assert(w._contextId === null, 'contextId cleared after destroy');
  });
});

describe('CdpWorld integration with actionability', () => {
  it('setCdpWorld stores global reference', async () => {
    const { setCdpWorld, getCdpWorld, clearCdpWorld } = await import('../../src/humor/actionability.js');
    const page = { context: () => ({ newCDPSession: async () => { throw new Error('no cdp'); } }), evaluate: async () => {} };
    const w = setCdpWorld(page);
    assert(getCdpWorld() === w, 'getCdpWorld returns set instance');
    clearCdpWorld();
    assert(getCdpWorld() === null, 'cleared reference is null');
  });

  it('isInputElement returns false for non-existent selector', async () => {
    const { isInputElement, clearCdpWorld } = await import('../../src/humor/actionability.js');
    clearCdpWorld();
    const page = { evaluate: async () => false };
    const result = await isInputElement(page, '#nonexistent');
    assert(result === false, 'non-existent element is not input');
  });

  it('isInputElement returns true for input selector via fallback', async () => {
    const { isInputElement, clearCdpWorld } = await import('../../src/humor/actionability.js');
    clearCdpWorld();
    const page = { evaluate: async () => true };
    const result = await isInputElement(page, '#email');
    assert(result === true, 'input element returns true');
  });

  it('checkPointerEvents returns false for non-existent selector', async () => {
    const { checkPointerEvents, clearCdpWorld } = await import('../../src/humor/actionability.js');
    clearCdpWorld();
    const page = { evaluate: async () => false };
    const result = await checkPointerEvents(page, '#nope', 100, 100);
    assert(result === false, 'non-existent returns false');
  });
});

describe('New strike.js exports', () => {
  it('exports walkOutContext, walkOutBrowser, patchBrowser, CdpWorld', async () => {
    const mod = await import('../../src/humor/strike.js');
    assert(typeof mod.walkOut === 'function', 'walkOut is exported');
    assert(typeof mod.walkOutContext === 'function', 'walkOutContext is exported');
    assert(typeof mod.walkOutBrowser === 'function', 'walkOutBrowser is exported');
    assert(typeof mod.patchBrowser === 'function', 'patchBrowser is exported');
    assert(typeof mod.CdpWorld === 'function', 'CdpWorld is exported');
  });
});

describe('GeoIP unit tests', () => {
  it('resolveGeoip returns entity unchanged when no proxy', async () => {
    const { resolveGeoip } = await import('../../src/utils/geoip.js');
    const entity = { fingerprint: 7 };
    const result = await resolveGeoip(entity);
    assert(result === entity, 'unchanged when no proxy');
  });

  it('resolveGeoip returns entity unchanged when timezone+locale set', async () => {
    const { resolveGeoip } = await import('../../src/utils/geoip.js');
    const entity = { proxy: 'http://1.2.3.4:8080', timezone: 'Europe/London', locale: 'en-GB' };
    const result = await resolveGeoip(entity);
    assert(result === entity, 'unchanged when timezone+locale already set');
  });

  it('COUNTRY_LOCALE_MAP has expected entries', async () => {
    const { COUNTRY_LOCALE_MAP } = await import('../../src/utils/geoip.js');
    assert(COUNTRY_LOCALE_MAP.US === 'en-US', 'US maps to en-US');
    assert(COUNTRY_LOCALE_MAP.DE === 'de-DE', 'DE maps to de-DE');
    assert(COUNTRY_LOCALE_MAP.JP === 'ja-JP', 'JP maps to ja-JP');
    assert(COUNTRY_LOCALE_MAP.GB === 'en-GB', 'GB maps to en-GB');
  });
});

describe('Performance API stealth patches', () => {
  it('constellation.js exports injectConstellation', async () => {
    const mod = await import('../../src/stealth/constellation.js');
    assert(typeof mod.injectConstellation === 'function', 'injectConstellation exported');
    assert(typeof mod.CONSTELLATION === 'string', 'CONSTELLATION is a string');
  });

  it('CONSTELLATION string contains performance patches', async () => {
    const { CONSTELLATION } = await import('../../src/stealth/constellation.js');
    assert(CONSTELLATION.includes('Performance.prototype.now'), 'has performance.now patch');
    assert(CONSTELLATION.includes('performance.timeOrigin'), 'has timeOrigin patch');
    assert(CONSTELLATION.includes('performance.memory'), 'has memory patch');
  });
});

describe('SessionState', () => {
  it('constructor sets filePath and default data', async () => {
    const { SessionState } = await import('../../src/utils/session.js');
    const s = new SessionState('/tmp/test-session.json');
    assert(s.filePath === '/tmp/test-session.json', 'filePath set');
    assert(Array.isArray(s.data.cookies), 'cookies is array');
    assert(typeof s.data.localStorage === 'object', 'localStorage is object');
    assert(typeof s.data.sessionStorage === 'object', 'sessionStorage is object');
  });

  it('diff detects cookie count changes', async () => {
    const { SessionState } = await import('../../src/utils/session.js');
    const s = new SessionState();
    s.data = { cookies: [{ name: 'a' }], localStorage: {}, sessionStorage: {}, origin: '' };
    const other = { cookies: [{ name: 'a' }, { name: 'b' }], localStorage: {}, sessionStorage: {}, origin: '' };
    const changes = s.diff(other);
    assert(changes.length > 0, 'diff detects cookie count difference');
  });

  it('load handles missing file gracefully', async () => {
    const { SessionState } = await import('../../src/utils/session.js');
    const s = new SessionState('/tmp/nonexistent-' + Date.now() + '.json');
    await s.load();
    assert(Array.isArray(s.data.cookies), 'data loaded as empty');
  });

  it('persist saves and load restores', async () => {
    const { SessionState } = await import('../../src/utils/session.js');
    const path = '/tmp/cyk-test-' + Date.now() + '.json';
    const s = new SessionState(path);
    s.data = { cookies: [{ name: 'test', value: 'val' }], localStorage: {}, sessionStorage: {}, origin: '' };
    await s.persist();
    const s2 = new SessionState(path);
    await s2.load();
    assert(s2.data.cookies.length === 1, 'persisted cookie restored');
    assert(s2.data.cookies[0].name === 'test', 'cookie name preserved');
    const { unlink } = await import('fs/promises');
    await unlink(path).catch(() => {});
  });
});

describe('EntityBrain key hold duration', () => {
  it('getKeyHoldDuration returns ms within expected range for human latency', async () => {
    const { EntityBrain } = await import('../../src/brain/entity.js');
    const brain = new EntityBrain({ operate: { latency: 'human' } });
    const duration = brain.getKeyHoldDuration();
    assert(typeof duration === 'number', 'returns a number');
    assert(duration >= 8, `duration ${duration} >= 8`);
    assert(duration <= 150, `duration ${duration} <= 150`);
  });

  it('instant latency gives shortest hold duration', async () => {
    const { EntityBrain } = await import('../../src/brain/entity.js');
    const brain = new EntityBrain({ operate: { latency: 'instant' } });
    const d = brain.getKeyHoldDuration();
    assert(d <= 40, `instant hold ${d} <= 40`);
  });

  it('all latency presets return valid durations', async () => {
    const { EntityBrain } = await import('../../src/brain/entity.js');
    const presets = ['instant', 'robotic', 'organic', 'human', 'sluggish'];
    for (const p of presets) {
      const brain = new EntityBrain({ operate: { latency: p } });
      const d = brain.getKeyHoldDuration();
      assert(typeof d === 'number' && d >= 5, `${p} duration ${d} valid`);
    }
  });
});
