import { isInputElement, waitStable, checkPointerEvents } from './actionability.js';
import { cognitiveHesitation, idleMicroMovement, coffeeBreak, strikeMove } from './behaviors.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let locatorPatched = false;
let elementHandlePatched = false;
let framePatched = false;

function _getPlaywright() {
  try { return require('playwright-core'); } catch {}
  try { return require('playwright'); } catch {}
  return null;
}

function _canAccess(loc) {
  return loc && loc.page && loc.page();
}

// ============================================================================
// Locator class patching — all locator methods route through patched page
// ============================================================================
function picketLine() {
  if (locatorPatched) return;
  const pw = _getPlaywright();
  if (!pw) return;

  const Lo = pw.Locator;
  if (!Lo) return;
  locatorPatched = true;

  const O = {
    click: Lo.prototype.click,
    type: Lo.prototype.type,
    fill: Lo.prototype.fill,
    hover: Lo.prototype.hover,
    dblclick: Lo.prototype.dblclick,
    check: Lo.prototype.check,
    uncheck: Lo.prototype.uncheck,
    selectOption: Lo.prototype.select_option,
    press: Lo.prototype.press,
    clear: Lo.prototype.clear,
  };

  Lo.prototype.click = function (opts) {
    if (_canAccess(this) && this.page()._onStrike) return this.page().click(this._selector, opts);
    return O.click.call(this, opts);
  };
  Lo.prototype.type = function (text, opts) {
    if (_canAccess(this) && this.page()._onStrike) return this.page().type(this._selector, text, opts);
    return O.type.call(this, text, opts);
  };
  Lo.prototype.fill = function (text, opts) {
    if (_canAccess(this) && this.page()._onStrike) return this.page().fill(this._selector, text, opts);
    return O.fill.call(this, text, opts);
  };
  Lo.prototype.hover = function (opts) {
    if (_canAccess(this) && this.page()._onStrike) return this.page().hover(this._selector, opts);
    return O.hover.call(this, opts);
  };
  Lo.prototype.dblclick = function (opts) {
    if (_canAccess(this) && this.page()._onStrike) return this.page().dblclick(this._selector, opts);
    return O.dblclick.call(this, opts);
  };
  Lo.prototype.check = function (opts) {
    if (_canAccess(this) && this.page()._onStrike) return this.page().check(this._selector, opts);
    return O.check.call(this, opts);
  };
  Lo.prototype.uncheck = function (opts) {
    if (_canAccess(this) && this.page()._onStrike) return this.page().uncheck(this._selector, opts);
    return O.uncheck.call(this, opts);
  };
  Lo.prototype.select_option = function (values, opts) {
    if (_canAccess(this) && this.page()._onStrike) return this.page().selectOption(this._selector, values, opts);
    return O.selectOption.call(this, values, opts);
  };
  Lo.prototype.press = function (key, opts) {
    if (_canAccess(this) && this.page()._onStrike) {
      const p = this.page();
      if (!p._strikeFocused(this._selector)) p.click(this._selector, opts);
      return p.keyboard.press(key);
    }
    return O.press.call(this, key, opts);
  };
  Lo.prototype.clear = function (opts) {
    if (_canAccess(this) && this.page()._onStrike) {
      this.page().click(this._selector, opts);
      return this.page().keyboard.press('Control+a');
    }
    return O.clear.call(this, opts);
  };
}

// ============================================================================
// ElementHandle class patching
// ============================================================================
function _patchElementHandles() {
  if (elementHandlePatched) return;
  const pw = _getPlaywright();
  if (!pw) return;

  const EH = pw.ElementHandle;
  if (!EH) return;
  elementHandlePatched = true;

  const O = {
    click: EH.prototype.click,
    type: EH.prototype.type,
    fill: EH.prototype.fill,
    hover: EH.prototype.hover,
    dblclick: EH.prototype.dblclick,
    press: EH.prototype.press,
    check: EH.prototype.check,
    uncheck: EH.prototype.uncheck,
    tap: EH.prototype.tap,
    focus: EH.prototype.focus,
    selectText: EH.prototype.select_text,
    scrollIntoView: EH.prototype.scroll_into_view_if_needed,
  };

  EH.prototype.click = function (opts) {
    if (this.page()?._onStrike) return this.page().click('#' + (this._impl?._selector || ''), opts);
    return O.click.call(this, opts);
  };
  EH.prototype.type = function (text, opts) {
    if (this.page()?._onStrike) return this.page().type('#' + (this._impl?._selector || ''), text, opts);
    return O.type.call(this, text, opts);
  };
  EH.prototype.fill = function (text, opts) {
    if (this.page()?._onStrike) return this.page().fill('#' + (this._impl?._selector || ''), text, opts);
    return O.fill.call(this, text, opts);
  };
  EH.prototype.hover = function (opts) {
    if (this.page()?._onStrike) return this.page().hover('#' + (this._impl?._selector || ''), opts);
    return O.hover.call(this, opts);
  };
  EH.prototype.dblclick = function (opts) {
    if (this.page()?._onStrike) return this.page().dblclick('#' + (this._impl?._selector || ''), opts);
    return O.dblclick.call(this, opts);
  };
}

// ============================================================================
// Frame class patching
// ============================================================================
function _patchFrames() {
  if (framePatched) return;
  const pw = _getPlaywright();
  if (!pw) return;

  const Fr = pw.Frame;
  if (!Fr) return;
  framePatched = true;

  const O = {
    click: Fr.prototype.click,
    type: Fr.prototype.type,
    fill: Fr.prototype.fill,
    hover: Fr.prototype.hover,
    dblclick: Fr.prototype.dblclick,
    goto: Fr.prototype.goto,
    reload: Fr.prototype.reload,
    selectOption: Fr.prototype.select_option,
    press: Fr.prototype.press,
    check: Fr.prototype.check,
    uncheck: Fr.prototype.uncheck,
  };

  Fr.prototype.click = function (selector, opts) {
    if (this.page?.()?._onStrike) return this.page().click(selector, opts);
    return O.click.call(this, selector, opts);
  };
  Fr.prototype.type = function (selector, text, opts) {
    if (this.page?.()?._onStrike) return this.page().type(selector, text, opts);
    return O.type.call(this, selector, text, opts);
  };
  Fr.prototype.fill = function (selector, text, opts) {
    if (this.page?.()?._onStrike) return this.page().fill(selector, text, opts);
    return O.fill.call(this, selector, text, opts);
  };
  Fr.prototype.hover = function (selector, opts) {
    if (this.page?.()?._onStrike) return this.page().hover(selector, opts);
    return O.hover.call(this, selector, opts);
  };
  Fr.prototype.dblclick = function (selector, opts) {
    if (this.page?.()?._onStrike) return this.page().dblclick(selector, opts);
    return O.dblclick.call(this, selector, opts);
  };
  Fr.prototype.goto = function (url, opts) {
    if (this.page?.()?._onStrike) return this.page().goto(url, opts);
    return O.goto.call(this, url, opts);
  };
  Fr.prototype.reload = function (opts) {
    if (this.page?.()?._onStrike) return this.page().reload(opts);
    return O.reload.call(this, opts);
  };
}

// ============================================================================
// walkOut — main entry: patches a page object
// ============================================================================
export function walkOut(page, choreographer, brain) {
  const originals = {
    click: page.click.bind(page),
    type: page.type.bind(page),
    fill: page.fill.bind(page),
    hover: page.hover.bind(page),
    dblclick: page.dblclick.bind(page),
    goto: page.goto.bind(page),
    reload: page.reload.bind(page),
    goBack: page.goBack.bind(page),
    goForward: page.goForward.bind(page),
    check: page.check?.bind(page),
    uncheck: page.uncheck?.bind(page),
    selectOption: page.selectOption?.bind(page),
    press: page.press?.bind(page),
    focus: page.focus?.bind(page),
    keyboardPress: page.keyboard.press.bind(page.keyboard),
  };

  const pageEvaluate = page.evaluate.bind(page);
  const origMouseMove = page.mouse.move.bind(page.mouse);
  const origMouseClick = page.mouse.click.bind(page.mouse);

  page._onStrike = true;
  page._originals = originals;

  page._strikeFocused = async function (sel) {
    try {
      return !!(await pageEvaluate(
        (s) => { const el = document.querySelector(s); return el && el === document.activeElement; },
        sel,
      ));
    } catch { return false; }
  };

  page._strikeScrollIntoView = async function (sel, timeout) {
    const box = await page.locator(sel).first().boundingBox({ timeout }).catch(() => null);
    if (box) return box;
    await pageEvaluate(
      (s) => {
        const el = document.querySelector(s);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      },
      sel,
    );
    await sleep(brain.getDelay(200));
    return page.locator(sel).first().boundingBox({ timeout }).catch(() => null);
  };

  async function _interact(sel, timeout) {
    await coffeeBreak(page, brain, origMouseMove);

    const box = await page._strikeScrollIntoView(sel, timeout);
    if (!box || box.width === 0 || box.height === 0) throw new Error(`Element not found or zero-size: ${sel}`);

    const input = await isInputElement(page, sel);
    const cx = box.x + box.width / 2 + (input ? (Math.random() - 0.5) * box.width * 0.2 : (Math.random() - 0.5) * box.width * 0.3);
    const cy = box.y + box.height / 2 + (input ? (Math.random() - 0.5) * box.height * 0.15 : (Math.random() - 0.5) * box.height * 0.3);
    const target = { x: Math.round(cx), y: Math.round(cy) };

    await idleMicroMovement(page, brain, origMouseMove);
    await strikeMove(page, brain, origMouseMove, target);
    return target;
  }

  page.goto = async function (url, opts) {
    await choreographer.goto(url, opts);
  };

  page.click = async function (sel, opts) {
    const timeout = opts?.timeout ?? 30000;
    await cognitiveHesitation(brain, page);
    const target = await _interact(sel, timeout);

    if (opts?.force !== true) {
      const ok = await checkPointerEvents(page, sel, target.x, target.y);
      if (!ok) throw new Error(`Element not reachable at ${target.x},${target.y}: ${sel}`);
      await waitStable(page, sel, 3000);
    }

    await page.mouse.down();
    await sleep(brain.getDelay(30));
    await page.mouse.up();
    await sleep(brain.getDelay(80));
  };

  page.hover = async function (sel, opts) {
    const timeout = opts?.timeout ?? 30000;
    await _interact(sel, timeout);
    const linger = opts?.linger ?? brain.getDelay(800);
    await sleep(linger);
  };

  page.dblclick = async function (sel, opts) {
    const timeout = opts?.timeout ?? 30000;
    await cognitiveHesitation(brain, page);
    const target = await _interact(sel, timeout);

    await page.mouse.down();
    await sleep(brain.getDelay(25));
    await page.mouse.up();
    await sleep(brain.getDelay(40));
    await page.mouse.down();
    await sleep(brain.getDelay(25));
    await page.mouse.up();
    await sleep(brain.getDelay(80));
  };

  page.type = async function (sel, text, opts) {
    const timeout = opts?.timeout ?? 30000;
    await cognitiveHesitation(brain, page);
    const target = await _interact(sel, timeout);

    await page.mouse.down();
    await sleep(brain.getDelay(20));
    await page.mouse.up();
    await sleep(brain.getDelay(80));

    const input = await isInputElement(page, sel);
    if (input) {
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (brain.shouldMakeTypo() && !opts?.noTypos) {
          const wrong = String.fromCharCode(97 + Math.floor(brain._rng() * 26));
          await originals.keyboardPress(wrong);
          await sleep(brain.getTypingDelay() * 0.5);
          await originals.keyboardPress('Backspace');
          await sleep(brain.getTypingDelay() * 0.8);
        }
        if (char === ' ') await originals.keyboardPress('Space');
        else await originals.keyboardPress(char);
        await sleep(brain.getTypingDelay());
      }
    }
  };

  page.fill = async function (sel, text, opts) {
    const timeout = opts?.timeout ?? 30000;
    await cognitiveHesitation(brain, page);
    const target = await _interact(sel, timeout);

    await page.mouse.down();
    await sleep(brain.getDelay(20));
    await page.mouse.up();
    await sleep(brain.getDelay(80));

    await originals.keyboardPress('Control+a');
    await sleep(brain.getDelay(50));
    await originals.keyboardPress('Backspace');
    await sleep(brain.getDelay(80));

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === ' ') await originals.keyboardPress('Space');
      else await originals.keyboardPress(char);
      await sleep(brain.getTypingDelay());
    }
  };

  page.check = async function (sel, opts) {
    const checked = await pageEvaluate((s) => { const el = document.querySelector(s); return el?.checked ?? false; }, sel);
    if (!checked) await page.click(sel, opts);
  };

  page.uncheck = async function (sel, opts) {
    const checked = await pageEvaluate((s) => { const el = document.querySelector(s); return el?.checked ?? false; }, sel);
    if (checked) await page.click(sel, opts);
  };

  page.press = async function (sel, key, opts) {
    const timeout = opts?.timeout ?? 30000;
    await _interact(sel, timeout);
    await page._strikeFocused(sel);
    await originals.keyboardPress(key);
  };

  page.focus = async function (sel, opts) {
    const timeout = opts?.timeout ?? 30000;
    await _interact(sel, timeout);
  };

  page.selectOption = async function (sel, values, opts) {
    await cognitiveHesitation(brain, page);
    await page.hover(sel, opts);
    await sleep(brain.getDelay(150));
    const pwOpts = { ...opts };
    delete pwOpts.humor;
    originals.selectOption.call(page, sel, values, pwOpts).catch(() => {});
  };

  page.reload = async function (opts) {
    await choreographer.reload(opts);
  };

  page.goBack = async function (opts) {
    await choreographer.goBack(opts);
  };

  page.goForward = async function (opts) {
    await choreographer.goForward(opts);
  };

  page.mouse.move = async function (x, y) {
    await strikeMove(page, brain, origMouseMove, { x, y });
  };

  page.mouse.click = async function (x, y, opts) {
    await strikeMove(page, brain, origMouseMove, { x, y });
    await sleep(brain.getDelay(50));
    await origMouseClick(x, y, opts);
  };

  page.keyboard.type = async function (text, opts) {
    const delay = opts?.delay ?? brain.getTypingDelay();
    for (const char of text) {
      await sleep(delay);
      await originals.keyboardPress(char);
    }
  };

  picketLine();
  _patchElementHandles();
  _patchFrames();
}
