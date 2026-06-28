// Choreographer — fluent, chainable automation DSL with deep stealth, telemetry, and hooks

import { injectConstellation } from '../stealth/constellation.js';
import { injectPhantom } from '../stealth/phantom.js';
import { StealthEval } from '../stealth/eval.js';
import { Observer } from '../agents/observer.js';
import { Weave } from './weave.js';
import { Perceptual } from '../agents/perceptual.js';
import { injectCursorOverlay } from '../stealth/cursor.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Choreographer {
  constructor(page, brain, opts = {}) {
    this.page = page;
    this.brain = brain;
    this.telemetry = opts.telemetry;
    this.hooks = opts.hooks;
    this.strategist = opts.strategist ?? null;
    this.logs = [];
    this._lastResult = null;
    this.observer = new Observer(page);
    this.stealthInjected = false;
    this.attention = { x: 500, y: 300 };
    this.weave = new Weave(page);
    this.perceptual = new Perceptual(opts.fingerprintSeed ?? brain.entity?.fingerprint ?? 7);
    this.stealth = null;
    this._origGoto = page.goto.bind(page);
    this._origReload = page.reload.bind(page);
    this._origGoBack = page.goBack.bind(page);
    this._origGoForward = page.goForward.bind(page);
  }

  _log(type, payload) {
    const entry = { ts: Date.now(), type, payload };
    this.logs.push(entry);
    if (this.telemetry) this.telemetry.record(type, payload);
    if (this.hooks) this.hooks.emit(`action:${type}`, payload);
    return entry;
  }

  async _ensureStealth() {
    if (this.stealthInjected) return;
    await injectConstellation(this.page);
    await injectPhantom(this.page);
    await this.page.addInitScript(this.perceptual.getPatches());
    await injectCursorOverlay(this.page); // Visual cursor overlay
    await this.observer.install();
    try { await this.weave.install(); } catch (_) {}
    this.stealth = new StealthEval(this.page);
    this.stealthInjected = true;
  }

  // --- Actionability checks ---
  async _isElementVisible(selector, timeout = 5000) {
    const locator = this.page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async _ensureActionable(selector, type = 'click') {
    const isVisible = await this._isElementVisible(selector);
    if (!isVisible) {
      throw new Error(`Element not visible: ${selector}`);
    }
    const box = await this.page.locator(selector).first().boundingBox();
    if (!box || box.width === 0 || box.height === 0) {
      throw new Error(`Element has zero size: ${selector}`);
    }
    const attrs = await this.page.locator(selector).first().evaluate((el) => ({
      disabled: el.disabled === true || el.getAttribute('disabled') !== null,
      readonly: el.readOnly === true || el.getAttribute('readonly') !== null,
      pointerEvents: getComputedStyle(el).pointerEvents,
      tagName: el.tagName,
    })).catch(() => ({}));
    if (attrs.disabled) throw new Error(`Element is disabled: ${selector}`);
    if (type === 'type' && attrs.readonly) throw new Error(`Element is readonly: ${selector}`);
    if (attrs.pointerEvents === 'none') throw new Error(`Element has pointer-events: none: ${selector}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  }

  async goto(url, opts = {}) {
    this._log('navigate', { url, opts });
    await this._ensureStealth();
    const result = await this._origGoto(url, { waitUntil: opts.waitUntil ?? 'networkidle', timeout: opts.timeout ?? 30000 });
    await sleep(this.brain.getDelay(200));
    const challenge = await this.observer.detectCaptcha();
    this._log('challenged', challenge);
    if (challenge.detected && this.strategist) {
      this.strategist.adaptFromObserver(challenge);
    }
    if (this.stealth) this.stealth.invalidate();
    this._lastResult = { url, title: await this.page.title(), captcha: challenge };
    return this;
  }

  async click(selector, opts = {}) {
    this._log('click', { selector, opts });
    await this._ensureStealth();

    const { x, y, box } = await this._ensureActionable(selector);
    if (!box) throw new Error(`Element not found: ${selector}`);

    const target = {
      x: box.x + box.width / 2 + (Math.random() - 0.5) * box.width * 0.3,
      y: box.y + box.height / 2 + (Math.random() - 0.5) * box.height * 0.3,
    };

    await this._strikeMove(target);
    await sleep(this.brain.getDelay(100));
    await this.page.mouse.down();
    await sleep(this.brain.getDelay(30));
    await this.page.mouse.up();
    await sleep(this.brain.getDelay(80));

    if (opts.waitForNavigation) {
      await this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }
    this._lastResult = { clicked: selector };
    return this;
  }

  async dblclick(selector, opts = {}) {
    this._log('dblclick', { selector, opts });
    await this._ensureStealth();

    const { x, y, box } = await this._ensureActionable(selector);
    if (!box) throw new Error(`Element not found: ${selector}`);

    const target = {
      x: box.x + box.width / 2 + (Math.random() - 0.5) * box.width * 0.3,
      y: box.y + box.height / 2 + (Math.random() - 0.5) * box.height * 0.3,
    };

    await this._strikeMove(target);
    await sleep(this.brain.getDelay(100));
    await this.page.mouse.down();
    await sleep(this.brain.getDelay(25));
    await this.page.mouse.up();
    await sleep(this.brain.getDelay(40));
    await this.page.mouse.down();
    await sleep(this.brain.getDelay(25));
    await this.page.mouse.up();
    await sleep(this.brain.getDelay(80));

    this._lastResult = { dblclicked: selector };
    return this;
  }

  async hover(selector, opts = {}) {
    this._log('hover', { selector, opts });
    await this._ensureStealth();
    const { box } = await this._ensureActionable(selector);
    if (!box) throw new Error(`Element not found: ${selector}`);

    const target = {
      x: box.x + box.width / 2 + (Math.random() - 0.5) * box.width * 0.2,
      y: box.y + box.height / 2 + (Math.random() - 0.5) * box.height * 0.2,
    };

    await this._strikeMove(target);
    const linger = opts.linger ?? this.brain.getDelay(800);
    await sleep(linger);
    this._lastResult = { hovered: selector };
    return this;
  }

  async type(selector, text, opts = {}) {
    this._log('type', { selector, length: text.length, opts });
    await this._ensureStealth();
    await this._ensureActionable(selector);

    const el = this.page.locator(selector).first();
    await el.focus();
    await sleep(this.brain.getDelay(100));

    let typed = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      try {
        if (this.brain.shouldMakeTypo() && !opts.noTypos) {
          const wrong = String.fromCharCode(97 + Math.floor(this.brain._rng() * 26));
          await this.page.keyboard.press(wrong);
          await sleep(this.brain.getTypingDelay() * 0.5);
          await this.page.keyboard.press('Backspace');
          await sleep(this.brain.getTypingDelay() * 0.8);
        }

        if (char === ' ') {
          await this.page.keyboard.press(' ');
          await sleep(this.brain.getTypingDelay() * 1.1);
        } else {
          await this.page.keyboard.press(char);
          await sleep(this.brain.getTypingDelay());
        }
        typed++;
      } catch {
        // Re-focus and retry once if keystroke fails mid-stream
        try {
          await this.page.locator(selector).first().focus();
          await sleep(this.brain.getDelay(50));
          if (char === ' ') {
            await this.page.keyboard.press(' ');
          } else {
            await this.page.keyboard.press(char);
          }
          typed++;
        } catch {}
      }
    }
    if (opts.submit) {
      await sleep(this.brain.getDelay(200));
      await this.page.keyboard.press('Enter');
    }
    this._lastResult = { typed };
    return this;
  }

  async scroll(opts = {}) {
    const direction = opts.direction ?? 'down';
    const amount = opts.amount ?? 500;
    this._log('scroll', { direction, amount });
    const currentScroll = await this.page.evaluate(() => window.scrollY);
    const points = this.brain.getScrollCurve(currentScroll, direction === 'down' ? amount : -amount);
    for (const y of points) {
      await this.page.evaluate((pos) => window.scrollTo(0, pos), y);
      await sleep(this.brain.getDelay(12));
    }
    this._lastResult = { scrolled: amount };
    return this;
  }

  async read(opts = {}) {
    this._log('read', opts);
    await this._ensureStealth();
    const pageHeight = await this.page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await this.page.evaluate(() => window.innerHeight);
    const chunkSize = opts.chunkSize ?? viewportHeight * 0.7;
    const iterations = Math.ceil(pageHeight / chunkSize);
    for (let i = 0; i < iterations; i++) {
      await this.scroll({ direction: 'down', amount: chunkSize });
      await sleep(this.brain.getDelay(300));
      if (Math.random() < 0.3) {
        await this.page.mouse.move(this.attention.x + 80, this.attention.y);
        await sleep(this.brain.getDelay(80));
        await this.page.mouse.move(this.attention.x, this.attention.y);
      }
      if (Math.random() < 0.4) {
        await sleep(this.brain.getDelay(1200));
      }
    }
    this._lastResult = { read: true };
    return this;
  }

  async idle(ms = 2000) {
    this._log('idle', { ms });
    const start = Date.now();
    while (Date.now() - start < ms) {
      const driftX = (Math.random() - 0.5) * 20;
      const driftY = (Math.random() - 0.5) * 20;
      await this.page.mouse.move(this.attention.x + driftX, this.attention.y + driftY);
      await sleep(200 + Math.random() * 300);
    }
    return this;
  }

  async _strikeMove(target) {
    const current = { x: this.brain.state.cursor.x, y: this.brain.state.cursor.y };
    const points = this.brain.getMouseCurve(current, target);
    for (const p of points) {
      await this.page.mouse.move(p.x, p.y);
      this.attention = { x: p.x, y: p.y };
      if (p.burst) await sleep(5 + Math.random() * 5);
      else await sleep(this.brain.getDelay(4));
    }
    this.brain.state.cursor = target;
  }

  async wait(condition, opts = {}) {
    if (typeof condition === 'number') {
      this._log('wait', { ms: condition });
      await sleep(condition + this.brain.getDelay(0));
    } else if (typeof condition === 'string') {
      this._log('waitForSelector', { selector: condition });
      await this.page.waitForSelector(condition, { timeout: opts.timeout ?? 10000 });
      await sleep(this.brain.getDelay(100));
    } else if (typeof condition === 'function') {
      this._log('waitForFunction');
      while (!(await this.page.evaluate(condition))) {
        await sleep(100);
      }
    } else {
      const ms = condition?.ms ?? 500;
      this._log('waitIdle', { ms });
      await sleep(ms + this.brain.getDelay(0));
    }
    this._lastResult = { waited: true };
    return this;
  }

  async screenshot(opts = {}) {
    this._log('screenshot', opts);
    const buffer = await this.page.screenshot({
      fullPage: opts.fullPage ?? false,
      type: opts.type ?? 'png',
    });
    this._lastResult = { screenshot: buffer };
    return this;
  }

  async eval(fn, ...args) {
    const result = await this.page.evaluate(fn, ...args);
    this._lastResult = { evalResult: result };
    return this;
  }

  async reload(opts = {}) {
    this._log('reload', opts);
    await this._origReload({ waitUntil: opts.waitUntil ?? 'networkidle', timeout: opts.timeout ?? 30000 });
    await sleep(this.brain.getDelay(200));
    return this;
  }

  async goBack(opts = {}) {
    this._log('goBack', opts);
    await this._origGoBack({ waitUntil: opts.waitUntil ?? 'networkidle', timeout: opts.timeout ?? 30000 });
    await sleep(this.brain.getDelay(150));
    return this;
  }

  async goForward(opts = {}) {
    this._log('goForward', opts);
    await this._origGoForward({ waitUntil: opts.waitUntil ?? 'networkidle', timeout: opts.timeout ?? 30000 });
    await sleep(this.brain.getDelay(150));
    return this;
  }

  async fill(selector, text, opts = {}) {
    this._log('fill', { selector, length: text.length });
    await this._ensureStealth();
    const el = this.page.locator(selector).first();
    await el.click();
    await sleep(this.brain.getDelay(80));
    await el.fill(text);
    await sleep(this.brain.getDelay(100));
    this._lastResult = { filled: text.length };
    return this;
  }

  async selectOption(selector, values, opts = {}) {
    this._log('selectOption', { selector, values });
    await this._ensureStealth();
    const el = this.page.locator(selector).first();
    await el.selectOption(values);
    await sleep(this.brain.getDelay(100));
    this._lastResult = { selected: values };
    return this;
  }

  async uploadFile(selector, filePaths) {
    this._log('uploadFile', { selector, files: filePaths });
    await this._ensureStealth();
    const el = this.page.locator(selector).first();
    await el.setInputFiles(filePaths);
    await sleep(this.brain.getDelay(150));
    this._lastResult = { uploaded: filePaths };
    return this;
  }

  async evaluate(fn, ...args) {
    return this.page.evaluate(fn, ...args);
  }

  async url() {
    return this.page.url();
  }

  async title() {
    return this.page.title();
  }

  async content() {
    return this.page.content();
  }

  get result() {
    return this._lastResult;
  }
}