// Maestro — orchestrates sessions with stealth, resilience, telemetry, and hooks
// IGNORE_DEFAULT_ARGS suppresses --enable-automation which leaks navigator.webdriver

import { chromium } from 'playwright-core';
import { EntityBrain } from '../brain/entity.js';
import { Choreographer } from './choreographer.js';
import { Sentinel } from './sentinel.js';
import { Poolize } from '../utils/poolize.js';
import { CookieJar } from '../utils/cookies.js';
import { Hooks } from '../utils/hooks.js';
import { Telemetry } from '../agents/telemetry.js';
import { Strategist } from '../agents/strategist.js';
import { Observer } from '../agents/observer.js';
import { Recorder } from './recorder.js';
import { ensureBinary } from '../download.js';
import { assertValidEntity } from '../utils/validate.js';
import { walkOut, walkOutContext, walkOutBrowser } from '../humor/strike.js';
import { AutoPilot } from '../agents/autoPilot.js';
import { Autonomous } from '../agents/autonomous.js';
import { resolveGeoip } from '../utils/geoip.js';

export const IGNORE_DEFAULT_ARGS = ['--enable-automation', '--enable-unsafe-swiftshader'];
export const DEFAULT_VIEWPORT = { width: 1920, height: 947 };

export class Maestro {
  constructor(opts = {}) {
    this.browsers = new Map();
    this.contexts = new Map();
    this.pages = new Map();
    this.sessionsState = new Map();
    this.pool = opts.pool ?? new Poolize({
      autoRecover: true,
      factory: async (id, oldSession) => {
        await this.close(id).catch(() => {});
        const state = this.sessionsState.get(id);
        if (!state) return null;
        const entity = { ...state.entity };
        entity.fingerprint = (entity.fingerprint ?? 7) + 1;
        const newSession = await this.launch(entity);
        return newSession;
      },
    });
    this.sentinel = opts.sentinel ?? new Sentinel();
    this.cookieJar = opts.cookieJar ?? new CookieJar(opts.cookieFile);
    this.hooks = opts.hooks ?? new Hooks();
    this.telemetry = opts.telemetry ?? new Telemetry();
    this.strategist = opts.strategist ?? new Strategist();
  }

  async _resolveBinary(entity) {
    if (entity.binary) return entity.binary;
    if (process.env.CYKANI_BINARY_PATH) {
      const { existsSync } = await import('fs');
      if (existsSync(process.env.CYKANI_BINARY_PATH)) return process.env.CYKANI_BINARY_PATH;
    }
    return ensureBinary();
  }

  async buildLaunchOptions(entity = {}) {
    assertValidEntity(entity);
    const brain = new EntityBrain(entity);
    const binaryPath = await this._resolveBinary(entity);
    const args = brain.getArgs();

    // Add IGNORE_DEFAULT_ARGS to suppress automation signals
    return {
      executablePath: binaryPath,
      headless: entity.operate?.headless ?? true,
      args,
      ignoreDefaultArgs: IGNORE_DEFAULT_ARGS,
    };
  }

  async launch(entity = {}) {
    if (entity.geoip) entity = { ...entity, ...(await resolveGeoip(entity)) };
    assertValidEntity(entity);
    const brain = new EntityBrain(entity);
    let executable = await this._resolveBinary(entity);
    if (!executable) throw new Error('CYKANI_BINARY_PATH environment variable is required or pass entity.binary');

    let proxy = entity.proxy;
    if (!proxy && this.pool.proxies.length > 0) proxy = this.pool.getNextProxy();

    const args = brain.getArgs();
    if (proxy) args.push(`--proxy-server=${proxy}`);

    this.hooks.emit('before:browserLaunch', { entity, proxy });

    const browser = await this.sentinel.execute(async () => {
      return chromium.launch({ executablePath: executable, headless: entity.operate?.headless ?? true, args, ignoreDefaultArgs: IGNORE_DEFAULT_ARGS });
    }, 'browser-launch');

    // Headed: viewport=null to keep outerWidth >= innerWidth coherent (prevents bot detection)
    // Headless: use DEFAULT_VIEWPORT for deterministic dimensions
    const headless = entity.operate?.headless ?? true;
    const viewport = entity.viewport ?? (headless ? DEFAULT_VIEWPORT : null);

    const context = await browser.newContext({
      viewport,
      locale: entity.locale ?? 'en-US',
      timezoneId: entity.timezone ?? 'America/New_York',
      extraHTTPHeaders: { 'Accept-Language': this._acceptLanguage(entity.locale) },
    });

    const page = await context.newPage();
    this.telemetry.installOnPage(page);
    this.hooks.emit('after:pageCreated', { page });

    const id = this._genId();
    const choreographer = new Choreographer(page, brain, { telemetry: this.telemetry, hooks: this.hooks, strategist: this.strategist });
    if (entity.humor) walkOut(page, choreographer, brain);

    this.browsers.set(id, browser);
    this.contexts.set(id, context);
    this.pages.set(id, page);
    this.sessionsState.set(id, { entity, brain, choreographer, proxy, createdAt: Date.now(), id });
    this.pool.register(id, this._getProxy(id));
    this._healthCheck(id).catch(() => {});
    return this._getProxy(id);
  }

  async close(id) {
    if (!id || (!this.browsers.has(id) && !this.contexts.has(id))) return;
    this.hooks.emit('before:close', { id });
    const browser = this.browsers.get(id);
    if (browser) {
      try {
        const ctx = this.contexts.get(id);
        if (ctx) { try { await ctx.close().catch(() => {}); } catch {} }
        await browser.close().catch(() => {});
      } catch {}
    } else {
      const ctx = this.contexts.get(id);
      if (ctx) await ctx.close().catch(() => {});
    }
    this.browsers.delete(id);
    this.contexts.delete(id);
    this.pages.delete(id);
    this.sessionsState.delete(id);
    this.pool.unregister(id);
    this.hooks.emit('after:close', { id });
  }

  async closeAll() {
    await Promise.all(Array.from(this.browsers.keys()).map((id) => this.close(id)));
  }

  getState(id) { return this.sessionsState.get(id); }

  async recover(id) {
    const state = this.sessionsState.get(id);
    if (!state) throw new Error(`Session ${id} not found`);
    const browser = this.browsers.get(id);
    if (!browser) {
      // Browser was closed — relaunch
      const newSession = await this.launch(state.entity);
      return newSession;
    }
    const headless = state.entity.operate?.headless ?? true;
    const viewport = state.entity.viewport ?? (headless ? DEFAULT_VIEWPORT : null);
    const newContext = await browser.newContext({
      viewport,
      locale: state.entity.locale ?? 'en-US',
      timezoneId: state.entity.timezone ?? 'America/New_York',
      extraHTTPHeaders: { 'Accept-Language': this._acceptLanguage(state.entity.locale) },
    }).catch(async () => {
      // Browser disconnected — relaunch
      const newSession = await this.launch(state.entity);
      return null;
    });
    if (!newContext) return this._getProxy(state.id);
    const newPage = await newContext.newPage();
    this.contexts.set(id, newContext);
    this.pages.set(id, newPage);
    state.choreographer = new Choreographer(newPage, state.brain, { telemetry: this.telemetry, hooks: this.hooks, strategist: this.strategist });
    if (state.entity.humor) walkOut(newPage, state.choreographer, state.brain);
    return this._getProxy(id);
  }

  async launchContext(entity = {}) {
    if (entity.geoip) entity = { ...entity, ...(await resolveGeoip(entity)) };
    assertValidEntity(entity);
    const brain = new EntityBrain(entity);
    let executable = await this._resolveBinary(entity);
    if (!executable) throw new Error('CYKANI_BINARY_PATH required');

    let proxy = entity.proxy;
    if (!proxy && this.pool.proxies.length > 0) proxy = this.pool.getNextProxy();

    const args = brain.getArgs();
    if (proxy) args.push(`--proxy-server=${proxy}`);

    const browser = await this.sentinel.execute(async () => {
      return chromium.launch({ executablePath: executable, headless: entity.operate?.headless ?? true, args, ignoreDefaultArgs: IGNORE_DEFAULT_ARGS });
    }, 'browser-launch');

    const headless = entity.operate?.headless ?? true;
    const viewport = entity.viewport ?? (headless ? DEFAULT_VIEWPORT : null);

    let context;
    try {
      context = await browser.newContext({
        viewport,
        locale: entity.locale ?? 'en-US',
        timezoneId: entity.timezone ?? 'America/New_York',
        extraHTTPHeaders: { 'Accept-Language': this._acceptLanguage(entity.locale) },
      });
    } catch (err) {
      await browser.close();
      throw err;
    }

    // Patch close() to also close browser
    const origClose = context.close.bind(context);
    context.close = async () => {
      await origClose();
      await browser.close();
    };

    const id = this._genId();
    const page = await context.newPage();
    const choreographer = new Choreographer(page, brain, { telemetry: this.telemetry, hooks: this.hooks, strategist: this.strategist });
    if (entity.humor) walkOut(page, choreographer, brain);
    this.browsers.set(id, browser);
    this.contexts.set(id, context);
    this.pages.set(id, page);
    this.sessionsState.set(id, { entity, brain, choreographer, proxy, createdAt: Date.now(), id });
    return this._getProxy(id);
  }

  async launchPersistentContext(entity = {}) {
    if (entity.geoip) entity = { ...entity, ...(await resolveGeoip(entity)) };
    assertValidEntity(entity);
    const brain = new EntityBrain(entity);
    let executable = await this._resolveBinary(entity);
    if (!executable) throw new Error('CYKANI_BINARY_PATH required');

    let proxy = entity.proxy;
    if (!proxy && this.pool.proxies.length > 0) proxy = this.pool.getNextProxy();

    const args = brain.getArgs();
    if (proxy) args.push(`--proxy-server=${proxy}`);

    const headless = entity.operate?.headless ?? true;
    const viewport = entity.viewport ?? (headless ? DEFAULT_VIEWPORT : null);

    const context = await chromium.launchPersistentContext(entity.userDataDir, {
      executablePath: executable,
      headless,
      args,
      ignoreDefaultArgs: IGNORE_DEFAULT_ARGS,
      viewport,
      locale: entity.locale,
      timezoneId: entity.timezone,
      extraHTTPHeaders: { 'Accept-Language': this._acceptLanguage(entity.locale) },
    });

    const id = this._genId();
    const page = context.pages()[0] || await context.newPage();
    const choreographer = new Choreographer(page, brain, { telemetry: this.telemetry, hooks: this.hooks, strategist: this.strategist });
    if (entity.humor) walkOut(page, choreographer, brain);
    this.contexts.set(id, context);
    this.pages.set(id, page);
    this.sessionsState.set(id, { entity, brain, choreographer, proxy, createdAt: Date.now(), id });
    return this._getProxy(id);
  }

  async connectOverCDP(endpoint, entity = {}) {
    if (!endpoint) throw new Error('CDP endpoint URL required');
    const brain = new EntityBrain({ ...entity, fingerprint: entity.fingerprint ?? Math.floor(Math.random() * 10000) });

    // Resolve endpoint to WebSocket URL if given an HTTP endpoint
    let wsUrl = endpoint;
    if (/^https?:\/\//.test(endpoint) && !endpoint.startsWith('ws')) {
      const resp = await fetch(`${endpoint}/json/version`).catch(() => null);
      if (!resp || !resp.ok) throw new Error(`Failed to connect to CDP endpoint: ${endpoint}`);
      const info = await resp.json();
      if (!info.webSocketDebuggerUrl) throw new Error(`No WebSocket debugger URL at ${endpoint}`);
      wsUrl = info.webSocketDebuggerUrl;
    }

    const browser = await chromium.connectOverCDP(wsUrl);
    const contexts = browser.contexts();
    const ctx = contexts[0] || await browser.newContext().catch(() => null);
    if (!ctx) throw new Error('Failed to create browser context');
    const pages = ctx.pages();
    const page = pages[0] || await ctx.newPage().catch(() => null);
    if (!page) throw new Error('Failed to create page');

    this.telemetry.installOnPage(page);

    const id = this._genId();
    const choreographer = new Choreographer(page, brain, { telemetry: this.telemetry, hooks: this.hooks, strategist: this.strategist });
    if (entity.humor) walkOut(page, choreographer, brain);

    this.browsers.set(id, browser);
    this.contexts.set(id, ctx);
    this.pages.set(id, page);
    this.sessionsState.set(id, { entity, brain, choreographer, proxy: null, createdAt: Date.now(), id, overCDP: true });
    return this._getProxy(id);
  }

  _getProxy(id) {
    const state = this.sessionsState.get(id);
    if (!state) return null;
    const c = state.choreographer;
    const pageRef = () => this.pages.get(id);
    let autoPilotRef = null;
    let autoRef = null;
    return {
      id,
      page: () => pageRef(),
      autoPilot: () => {
        if (!autoPilotRef) autoPilotRef = new AutoPilot(pageRef(), c);
        return autoPilotRef;
      },
      autonomous: () => {
        if (!autoRef) autoRef = new Autonomous(pageRef(), c);
        return autoRef;
      },
      goto: (url, opts) => c.goto(url, opts),
      click: (sel, opts) => c.click(sel, opts),
      dblclick: (sel, opts) => c.dblclick(sel, opts),
      hover: (sel, opts) => c.hover(sel, opts),
      type: (sel, text, opts) => c.type(sel, text, opts),
      fill: (sel, text, opts) => c.fill(sel, text, opts),
      selectOption: (sel, values, opts) => c.selectOption(sel, values, opts),
      uploadFile: (sel, paths) => c.uploadFile(sel, paths),
      scroll: (opts) => c.scroll(opts),
      read: (opts) => c.read(opts),
      reload: (opts) => c.reload(opts),
      goBack: (opts) => c.goBack(opts),
      goForward: (opts) => c.goForward(opts),
      idle: (ms) => c.idle(ms),
      wait: (cond, opts) => c.wait(cond, opts),
      screenshot: (opts) => c.screenshot(opts),
      eval: (fn, ...args) => c.eval(fn, ...args),
      evaluate: (fn, ...args) => c.evaluate(fn, ...args),
      url: () => c.url(),
      title: () => c.title(),
      content: () => c.content(),
      close: () => this.close(id),
      state: () => this.getState(id),
      cookies: () => this.cookieJar,
      brain: () => state.brain,
      record: () => new Recorder(c.logs),
      har: () => this.telemetry.exportHar(),
      exportHar: (filePath) => this._exportHar(id, filePath),
      on: (event, fn) => {
        const page = this.pages.get(id);
        if (page) page.on(event, fn);
      },
      off: (event, fn) => {
        const page = this.pages.get(id);
        if (page) page.off(event, fn);
      },
    };
  }

  async _exportHar(id, filePath) {
    const har = this.telemetry.exportHar();
    if (filePath) {
      const { writeFile } = await import('fs/promises');
      await writeFile(filePath, JSON.stringify(har, null, 2));
    }
    return har;
  }

  _genId() { return `cyk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }

  _acceptLanguage(locale) {
    const map = { 'en-US': 'en-US,en;q=0.9', 'en-GB': 'en-GB,en;q=0.9', 'de-DE': 'de-DE,de;q=0.9,en;q=0.8', 'fr-FR': 'fr-FR,fr;q=0.9,en;q=0.8', 'ja-JP': 'ja-JP,ja;q=0.9,en;q=0.8', 'zh-CN': 'zh-CN,zh;q=0.9,en;q=0.8' };
    return (map[locale] ?? 'en-US,en;q=0.9');
  }

  async _healthCheck(id) {
    const page = this.pages.get(id);
    if (!page) return;
    try { await page.evaluate(() => navigator.userAgent); } catch { this.pool.recordFailure(this.sessionsState.get(id)?.proxy); }
  }
}