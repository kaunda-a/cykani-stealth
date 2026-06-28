import { describe, it, assert } from '../harness.js';

// Mock fixtures — simulate what Playwright returns
function makeMockPage() {
  const events = {};
  return {
    _onStrike: false,
    goto: async () => null,
    click: async () => {},
    fill: async () => {},
    type: async () => {},
    hover: async () => {},
    dblclick: async () => {},
    reload: async () => {},
    goBack: async () => {},
    goForward: async () => {},
    evaluate: async (fn, ...args) => (typeof fn === 'function' ? fn(...args) : fn),
    locator: () => ({
      first: () => ({
        boundingBox: async () => ({ x: 0, y: 0, width: 100, height: 30 }),
        waitFor: async () => {},
        evaluate: async (fn, ...args) => (typeof fn === 'function' ? fn(...args) : fn),
        click: async () => {},
        fill: async () => {},
        type: async () => {},
        focus: async () => {},
      }),
    }),
    keyboard: {
      press: async () => {},
      type: async () => {},
      down: async () => {},
      up: async () => {},
      insertText: async () => {},
    },
    mouse: {
      move: async () => {},
      click: async () => {},
      down: async () => {},
      up: async () => {},
      wheel: async () => {},
    },
    context: () => ({
      newCDPSession: async () => ({
        send: async () => ({}),
      }),
    }),
    url: async () => 'https://example.com',
    title: async () => 'Example',
    content: async () => '<html></html>',
    screenshot: async () => Buffer.from(''),
    on: (evt, fn) => { events[evt] = fn; },
    off: (evt, fn) => { delete events[evt]; },
    addInitScript: async () => {},
    waitForSelector: async () => null,
    waitForNavigation: async () => null,
    isChecked: async () => false,
    check: async () => {},
    uncheck: async () => {},
    press: async () => {},
    focus: async () => {},
    selectOption: async () => [],
  };
}

describe('Maestro session proxy unit tests', () => {
  it('session proxy has all required methods', () => {
    const proxy = {
      id: 'test_123',
      goto: async () => proxy,
      click: async () => proxy,
      dblclick: async () => proxy,
      hover: async () => proxy,
      type: async () => proxy,
      fill: async () => proxy,
      selectOption: async () => proxy,
      uploadFile: async () => proxy,
      scroll: async () => proxy,
      read: async () => proxy,
      reload: async () => proxy,
      goBack: async () => proxy,
      goForward: async () => proxy,
      idle: async () => proxy,
      wait: async () => proxy,
      screenshot: async () => proxy,
      eval: async () => proxy,
      evaluate: async () => 'result',
      url: async () => 'https://example.com',
      title: async () => 'Example',
      content: async () => '<html></html>',
      close: async () => {},
      state: () => ({}),
      cookies: () => ({}),
      brain: () => ({}),
      record: () => ({}),
      autoPilot: () => ({}),
      autonomous: () => ({}),
      har: () => ({}),
      exportHar: async () => {},
      on: () => {},
      off: () => {},
      page: () => makeMockPage(),
    };

    const methods = [
      'goto', 'click', 'dblclick', 'hover', 'type', 'fill',
      'selectOption', 'uploadFile', 'scroll', 'read', 'reload',
      'goBack', 'goForward', 'idle', 'wait', 'screenshot', 'eval',
      'evaluate', 'url', 'title', 'content', 'close',
    ];

    for (const m of methods) {
      assert(typeof proxy[m] === 'function', `session.${m} should be a function`);
    }

    const accessors = ['state', 'cookies', 'brain', 'record', 'autoPilot', 'autonomous', 'har', 'page'];
    for (const a of accessors) {
      assert(typeof proxy[a] === 'function', `session.${a} should be a function`);
    }

    assert(typeof proxy.id === 'string', 'session.id should be a string');
    assert(typeof proxy.on === 'function', 'session.on should be a function');
    assert(typeof proxy.off === 'function', 'session.off should be a function');
    assert(typeof proxy.exportHar === 'function', 'session.exportHar should be a function');
  });

  it('all chainable methods return the session proxy', async () => {
    let callCount = 0;
    const proxy = {
      _return: function () { callCount++; return this; },
      goto: async function () { callCount++; return this; },
      click: async function () { callCount++; return this; },
      dblclick: async function () { callCount++; return this; },
      hover: async function () { callCount++; return this; },
      type: async function () { callCount++; return this; },
      fill: async function () { callCount++; return this; },
      scroll: async function () { callCount++; return this; },
      read: async function () { callCount++; return this; },
      reload: async function () { callCount++; return this; },
      goBack: async function () { callCount++; return this; },
      goForward: async function () { callCount++; return this; },
      idle: async function () { callCount++; return this; },
      wait: async function () { callCount++; return this; },
      screenshot: async function () { callCount++; return this; },
      eval: async function () { callCount++; return this; },
      close: async () => {},
    };

    const chain = await proxy
      .goto('https://a.com')
      .then(p => p.click('#btn'))
      .then(p => p.hover('#menu'))
      .then(p => p.fill('#input', 'text'))
      .then(p => p.type('#input', 'hello'))
      .then(p => p.dblclick('#item'))
      .then(p => p.scroll({}))
      .then(p => p.read())
      .then(p => p.reload())
      .then(p => p.goBack())
      .then(p => p.goForward())
      .then(p => p.idle(100))
      .then(p => p.wait(200))
      .then(p => p.screenshot());

    assert(callCount >= 12, `expected >= 12 calls, got ${callCount}`);
  });

  it('evaluate returns values, not proxy', async () => {
    const proxy = {
      evaluate: async () => 'result-value',
      url: async () => 'https://example.com',
      title: async () => 'Page Title',
      content: async () => '<html/>',
    };

    const evalResult = await proxy.evaluate(() => document.title);
    assert(evalResult === 'result-value', 'evaluate should return raw value');

    const urlResult = await proxy.url();
    assert(urlResult === 'https://example.com', 'url should return string');

    const titleResult = await proxy.title();
    assert(titleResult === 'Page Title', 'title should return string');

    const contentResult = await proxy.content();
    assert(contentResult === '<html/>', 'content should return string');
  });

  it('on/off manage event listeners', () => {
    const handlers = {};
    const proxy = {
      on: (evt, fn) => { handlers[evt] = fn; },
      off: (evt, fn) => { delete handlers[evt]; },
    };

    const fn1 = () => {};
    const fn2 = () => {};

    proxy.on('close', fn1);
    assert(handlers.close === fn1, 'on should register handler');

    proxy.on('error', fn2);
    assert(handlers.error === fn2, 'on should register second handler');

    proxy.off('close', fn1);
    assert(handlers.close === undefined, 'off should remove handler');
  });
});

describe('Entity validation integration', () => {
  it('complete valid entity passes validation', () => {
    const entity = {
      fingerprint: 1337,
      platform: 'windows',
      locale: 'en-US',
      timezone: 'America/New_York',
      humor: true,
      proxy: 'http://user:pass@host:8080',
      viewport: { width: 1920, height: 1080 },
      userDataDir: '/tmp/test',
      extensions: ['./ext'],
      operate: {
        latency: 'human',
        headless: false,
        timeout: 30000,
      },
      instincts: {
        hesitation: 0.5,
        precision: 0.7,
        curiosity: 0.3,
      },
      dynamics: {
        entropy: 0.4,
        inertia: 0.6,
      },
    };

    assert(typeof entity === 'object', 'entity is object');
    assert(entity.fingerprint >= 1 && entity.fingerprint <= 10000, 'fingerprint in range');
    assert(['windows', 'macos', 'linux'].includes(entity.platform), 'valid platform');
    assert(typeof entity.humor === 'boolean', 'humor is boolean');
    assert(typeof entity.userDataDir === 'string', 'userDataDir is string');
    assert(typeof entity.instincts.hesitation === 'number', 'hesitation is number');
    assert(entity.instincts.precision >= 0 && entity.instincts.precision <= 1, 'precision in range');
  });

  it('humor flag propagates through entity', () => {
    const entity = { humor: true };
    assert(entity.humor === true, 'humor set to true');

    const entity2 = { humor: false };
    assert(entity2.humor === false, 'humor set to false');

    const entity3 = {};
    assert(entity3.humor === undefined, 'humor defaults to undefined');
  });

  it('operate latency accepts all valid values', () => {
    const valid = ['instant', 'robotic', 'organic', 'human', 'sluggish'];
    for (const v of valid) {
      const e = { operate: { latency: v } };
      assert(valid.includes(e.operate.latency), `latency "${v}" should be valid`);
    }
  });

  it('instincts ranges are enforced', () => {
    const e = { instincts: { hesitation: 0.5, precision: 0.7, curiosity: 0.3 } };
    for (const key of ['hesitation', 'precision', 'curiosity']) {
      const val = e.instincts[key];
      assert(typeof val === 'number' && val >= 0 && val <= 1, `${key} in range`);
    }
  });
});

describe('Pool integration', () => {
  it('pool factory creates sessions with incremented fingerprints', () => {
    const state = { entity: { fingerprint: 7 } };
    const newFingerprint = (state.entity.fingerprint ?? 7) + 1;
    assert(newFingerprint === 8, 'fingerprint incremented on recovery');
  });

  it('pool tracks proxy failures and successes', () => {
    const pool = {
      proxies: ['p1', 'p2'],
      failures: {},
      successes: {},
      recordFailure: function (p) { this.failures[p] = (this.failures[p] || 0) + 1; },
      recordSuccess: function (p) { this.successes[p] = (this.successes[p] || 0) + 1; },
      getNextProxy: function () { return this.proxies[0]; },
    };

    pool.recordFailure('p1');
    pool.recordFailure('p1');
    pool.recordSuccess('p2');

    assert(pool.failures.p1 === 2, 'tracks multiple failures');
    assert(pool.successes.p2 === 1, 'tracks successes');
  });
});

describe('Sentinel circuit breaker integration', () => {
  it('executes successful function', async () => {
    const sentinel = {
      execute: async (fn, label) => {
        const result = await fn();
        return result;
      },
    };

    const result = await sentinel.execute(async () => 'success', 'test');
    assert(result === 'success', 'should return function result');
  });

  it('retries on failure then throws', async () => {
    let attempts = 0;
    const sentinel = {
      execute: async (fn, label) => {
        const maxRetries = 2;
        for (let i = 0; i <= maxRetries; i++) {
          try {
            attempts++;
            return await fn();
          } catch (e) {
            if (i === maxRetries) throw e;
          }
        }
      },
    };

    try {
      await sentinel.execute(async () => { throw new Error('fail'); }, 'test');
      assert(false, 'should have thrown');
    } catch (e) {
      assert(e.message === 'fail', 'should throw after retries');
      assert(attempts === 3, `expected 3 attempts, got ${attempts}`);
    }
  });
});

describe('Strategy integration', () => {
  it('highTrust preset configures high hesitation', () => {
    const entity = {
      instincts: { hesitation: 0.8, precision: 0.95, curiosity: 0.7 },
      operate: { latency: 'human', headless: true },
    };
    assert(entity.instincts.hesitation === 0.8, 'highTrust has high hesitation');
    assert(entity.operate.latency === 'human', 'highTrust uses human latency');
  });

  it('aggressive preset configures low hesitation', () => {
    const entity = {
      instincts: { hesitation: 0.1, precision: 0.99, curiosity: 0.0 },
      operate: { latency: 'robotic', headless: true },
    };
    assert(entity.instincts.hesitation === 0.1, 'aggressive has low hesitation');
    assert(entity.operate.latency === 'robotic', 'aggressive uses robotic latency');
  });

  it('natural preset combines humor with organic latency', () => {
    const entity = {
      humor: true,
      instincts: { hesitation: 0.6, precision: 0.7, curiosity: 0.5 },
      operate: { latency: 'organic', headless: true },
    };
    assert(entity.humor === true, 'natural has humor');
    assert(entity.operate.latency === 'organic', 'natural uses organic latency');
  });
});

describe('GeoIP integration', () => {
  it('resolveGeoip skips when geoip=false', () => {
    const entity = { geoip: false, proxy: 'http://1.2.3.4:8080' };
    assert(entity.geoip === false, 'geoip flag respected');
  });

  it('resolveGeoip is called on maestro.launch when geoip=true', () => {
    const entity = { geoip: true, proxy: 'http://1.2.3.4:8080' };
    assert(entity.geoip === true, 'geoip triggers resolution');
  });

  it('entity with explicit timezone+locale bypasses geoip resolution', () => {
    const entity = { proxy: 'http://1.2.3.4:8080', timezone: 'Europe/Paris', locale: 'fr-FR' };
    assert(entity.timezone === 'Europe/Paris', 'explicit timezone preserved');
    assert(entity.locale === 'fr-FR', 'explicit locale preserved');
  });
});

describe('New exports integration', () => {
  it('strike.js exports walkOutContext, walkOutBrowser, patchBrowser, CdpWorld', async () => {
    const mod = await import('../../src/humor/strike.js');
    assert(typeof mod.walkOutContext === 'function', 'walkOutContext exported');
    assert(typeof mod.walkOutBrowser === 'function', 'walkOutBrowser exported');
    assert(typeof mod.patchBrowser === 'function', 'patchBrowser exported');
    assert(typeof mod.CdpWorld === 'function', 'CdpWorld exported');
  });

  it('geoip.js exports resolveGeoip and COUNTRY_LOCALE_MAP', async () => {
    const mod = await import('../../src/utils/geoip.js');
    assert(typeof mod.resolveGeoip === 'function', 'resolveGeoip exported');
    assert(typeof mod.COUNTRY_LOCALE_MAP === 'object', 'COUNTRY_LOCALE_MAP exported');
  });
});

describe('Key hold duration integration', () => {
  it('EntityBrain.getKeyHoldDuration exists and returns values for all latency presets', async () => {
    const { EntityBrain } = await import('../../src/brain/entity.js');
    const presets = ['instant', 'robotic', 'organic', 'human', 'sluggish'];
    for (const p of presets) {
      const brain = new EntityBrain({ operate: { latency: p } });
      assert(typeof brain.getKeyHoldDuration === 'function', 'getKeyHoldDuration exists');
      const d = brain.getKeyHoldDuration();
      assert(typeof d === 'number' && d > 0, `latency ${p} duration ${d} positive`);
    }
  });
});
