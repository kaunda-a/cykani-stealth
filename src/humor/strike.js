import { createRequire } from 'module';
import { isInputElement, waitStable, checkPointerEvents, setCdpWorld, getCdpWorld, clearCdpWorld, CdpWorld } from './actionability.js';
import { cognitiveHesitation, idleMicroMovement, coffeeBreak, strikeMove } from './behaviors.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let locatorPatched = false;
let elementHandlePatched = false;
let framePatched = false;
let puppeteerPatched = false;
let _pwReq = null;

function _getPlaywright() {
  if (_pwReq) return _pwReq;
  try {
    _pwReq = createRequire(import.meta.url)('playwright-core');
    return _pwReq;
  } catch {}
  try {
    _pwReq = createRequire(import.meta.url)('playwright');
    return _pwReq;
  } catch {}
  return null;
}

function _canAccess(loc) {
  return loc && loc.page && loc.page();
}

// Shift-symbol key mapping (US keyboard layout)
const SHIFT_SYMBOLS = {
  '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  '_': '-', '+': '=',
  '{': '[', '}': ']', '|': '\\',
  ':': ';', '"': '\'',
  '<': ',', '>': '.', '?': '/',
  '~': '`',
};

// Minimal keyboard code mapping for shift-symbol CDP dispatch
const KEY_CODES = {
  '1': 'Digit1', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4', '5': 'Digit5',
  '6': 'Digit6', '7': 'Digit7', '8': 'Digit8', '9': 'Digit9', '0': 'Digit0',
  '-': 'Minus', '=': 'Equal',
  '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash',
  ';': 'Semicolon', '\'': 'Quote',
  ',': 'Comma', '.': 'Period', '/': 'Slash',
  '`': 'Backquote',
};

const KEY_VK = {
  '1': 49, '2': 50, '3': 51, '4': 52, '5': 53,
  '6': 54, '7': 55, '8': 56, '9': 57, '0': 48,
  '-': 189, '=': 187,
  '[': 219, ']': 221, '\\': 220,
  ';': 186, '\'': 222,
  ',': 188, '.': 190, '/': 191,
  '`': 192,
};

// ============================================================================
// CDP-based shift-symbol typing for isTrusted=true events
// ============================================================================
async function _typeShiftSymbolViaCdp(cdpSession, char) {
  const base = SHIFT_SYMBOLS[char];
  if (!base) return false;

  const code = KEY_CODES[base] || 'KeyA';
  const vk = KEY_VK[base] || 65;

  // Shift down
  await cdpSession.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16, modifiers: 0,
  });

  // Symbol key down
  await cdpSession.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key: char, code, windowsVirtualKeyCode: vk, modifiers: 8, location: 0,
  });

  // Char event
  await cdpSession.send('Input.dispatchKeyEvent', {
    type: 'char', key: char, text: char, unmodifiedText: base, modifiers: 8,
  });

  // Symbol key up
  await cdpSession.send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: char, code, windowsVirtualKeyCode: vk, modifiers: 8, location: 0,
  });

  // Shift up
  await cdpSession.send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16, modifiers: 0,
  });

  return true;
}

// ============================================================================
// Key hold duration typing
// ============================================================================
async function _typeWithHold(brain, keyFn, char, holdMs, betweenMs) {
  if (holdMs > 0) {
    await keyFn('KeyDown', char);
    await sleep(holdMs);
    await keyFn('KeyUp', char);
  } else {
    await keyFn('Press', char);
  }
  await sleep(betweenMs);
}

async function _dispatchChar(page, cdpSession, brain, char) {
  // Try CDP shift-symbol dispatch first
  if (cdpSession && /[^a-zA-Z0-9 ]/.test(char) && char === char.toUpperCase() && char !== char.toLowerCase()) {
    // Character requires shift — try CDP path
    const done = await _typeShiftSymbolViaCdp(cdpSession, char);
    if (done) return true;
  }

  const holdMs = brain.getKeyHoldDuration ? brain.getKeyHoldDuration() : 0;
  const betweenMs = brain.getTypingDelay();

  if (char === ' ') {
    if (holdMs > 0) {
      const kb = page.keyboard;
      await kb.down('Space');
      await sleep(holdMs);
      await kb.up('Space');
    } else {
      await page.keyboard.press('Space');
    }
    await sleep(betweenMs);
    return true;
  }

  // Check if character requires Shift
  const isUpper = char >= 'A' && char <= 'Z';
  const isShiftSymbol = SHIFT_SYMBOLS[char] !== undefined;

  if (isUpper || isShiftSymbol) {
    const baseKey = isUpper ? char.toLowerCase() : SHIFT_SYMBOLS[char];
    if (holdMs > 0) {
      await page.keyboard.down('Shift');
      await sleep(15 + brain._rng() * 25);
      await page.keyboard.down(baseKey);
      await sleep(holdMs);
      await page.keyboard.up(baseKey);
      await sleep(10);
      await page.keyboard.up('Shift');
    } else {
      await page.keyboard.press('Shift+' + baseKey);
    }
    await sleep(betweenMs);
    return true;
  }

  // Regular character
  if (holdMs > 0) {
    await page.keyboard.down(char);
    await sleep(holdMs);
    await page.keyboard.up(char);
  } else {
    await page.keyboard.press(char);
  }
  await sleep(betweenMs);
  return true;
}

// ============================================================================
// Locator class patching
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
      this.page().click(this._selector, opts);
      return this.page().keyboard.press(key);
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
// ElementHandle patching
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
// Frame patching
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
// Puppeteer support — patch Puppeteer Page + ElementHandle
// ============================================================================
function _patchPuppeteer() {
  if (puppeteerPatched) return;
  const pw = _getPlaywright();
  if (!pw) return;
  const puppeteer = pw._puppeteer;
  if (!puppeteer?.Page) return;
  puppeteerPatched = true;

  const Po = {
    click: puppeteer.Page.prototype.click,
    type: puppeteer.Page.prototype.type,
    hover: puppeteer.Page.prototype.hover,
    goBack: puppeteer.Page.prototype.goBack,
    goForward: puppeteer.Page.prototype.goForward,
    reload: puppeteer.Page.prototype.reload,
  };

  puppeteer.Page.prototype.click = function (sel, opts) {
    if (this._onStrike) return this._strikeClick(sel, opts);
    return Po.click.call(this, sel, opts);
  };
  puppeteer.Page.prototype.type = function (sel, text, opts) {
    if (this._onStrike) return this._strikeType(sel, text, opts);
    return Po.type.call(this, sel, text, opts);
  };
  puppeteer.Page.prototype.hover = function (sel, opts) {
    if (this._onStrike) return this._strikeHover(sel, opts);
    return Po.hover.call(this, sel, opts);
  };

  if (puppeteer.ElementHandle) {
    const Eo = {
      click: puppeteer.ElementHandle.prototype.click,
      type: puppeteer.ElementHandle.prototype.type,
    };
    puppeteer.ElementHandle.prototype.click = function (opts) {
      if (this.page?._onStrike) return this.page._strikeClick('#' + (this._remoteObject?.description || ''), opts);
      return Eo.click.call(this, opts);
    };
    puppeteer.ElementHandle.prototype.type = function (text, opts) {
      if (this.page?._onStrike) return this.page._strikeType('#' + (this._remoteObject?.description || ''), text, opts);
      return Eo.type.call(this, text, opts);
    };
  }
}

// ============================================================================
// walkOut — patch a single page
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

  // Initialize CDP isolated world for stealth DOM queries
  const cdpWorld = setCdpWorld(page);

  // Reference for CDP shift-symbol dispatch
  let _cdpSession = null;
  let _cdpSessionClosed = false;
  page._getCdpSessionForTyping = async function () {
    if (_cdpSession && !_cdpSessionClosed) return _cdpSession;
    if (_cdpSessionClosed) _cdpSession = null;
    try {
      _cdpSession = await page.context().newCDPSession(page);
      _cdpSessionClosed = false;
      _cdpSession.on('disconnected', () => { _cdpSessionClosed = true; });
      return _cdpSession;
    } catch { return null; }
  };

  // Cleanup CDP resources when page closes
  const _cleanup = () => {
    clearCdpWorld();
    if (_cdpSession) {
      try { _cdpSession.detach().catch(() => {}); } catch {}
      _cdpSession = null;
    }
    if (page.removeListener) page.removeListener('close', _cleanup);
  };
  page.on('close', _cleanup);

  page._strikeFocused = async function (sel) {
    try {
      return !!(await (cdpWorld ? cdpWorld.evaluate(
        (s) => { const el = document.querySelector(s); return el && el === document.activeElement; },
        sel,
      ) : pageEvaluate(
        (s) => { const el = document.querySelector(s); return el && el === document.activeElement; },
        sel,
      )));
    } catch { return false; }
  };

  page._strikeScrollIntoView = async function (sel, timeout) {
    const box = await page.locator(sel).first().boundingBox({ timeout }).catch(() => null);
    if (box) return box;
    await (cdpWorld ? cdpWorld.evaluate(
      (s) => {
        const el = document.querySelector(s);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      },
      sel,
    ) : pageEvaluate(
      (s) => {
        const el = document.querySelector(s);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      },
      sel,
    ));
    await sleep(brain.getDelay(200));
    return page.locator(sel).first().boundingBox({ timeout }).catch(() => null);
  };

  // Per-call humor config override
  async function _withHumor(humorOpts, fn) {
    if (!humorOpts || typeof humorOpts !== 'object') return fn();
    const saved = {};
    const inst = brain.entity.instincts;
    const dyn = brain.entity.dynamics;
    const op = brain.entity.operate;
    if (humorOpts.hesitation != null) { saved.hesitation = inst.hesitation; inst.hesitation = humorOpts.hesitation; }
    if (humorOpts.precision != null) { saved.precision = inst.precision; inst.precision = humorOpts.precision; }
    if (humorOpts.curiosity != null) { saved.curiosity = inst.curiosity; inst.curiosity = humorOpts.curiosity; }
    if (humorOpts.entropy != null) { saved.entropy = dyn.entropy; dyn.entropy = humorOpts.entropy; }
    if (humorOpts.latency != null) { saved.latency = op.latency; op.latency = humorOpts.latency; }
    try { return await fn(); }
    finally {
      if (saved.hesitation != null) inst.hesitation = saved.hesitation;
      if (saved.precision != null) inst.precision = saved.precision;
      if (saved.curiosity != null) inst.curiosity = saved.curiosity;
      if (saved.entropy != null) dyn.entropy = saved.entropy;
      if (saved.latency != null) op.latency = saved.latency;
    }
  }

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
    cdpWorld?.invalidate();
    await choreographer.goto(url, opts);
  };

  page.click = async function (sel, opts) {
    return _withHumor(opts?.humor, async () => {
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
    });
  };

  page.hover = async function (sel, opts) {
    return _withHumor(opts?.humor, async () => {
      const timeout = opts?.timeout ?? 30000;
      await _interact(sel, timeout);
      const linger = opts?.linger ?? brain.getDelay(800);
      await sleep(linger);
    });
  };

  page.dblclick = async function (sel, opts) {
    return _withHumor(opts?.humor, async () => {
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
    });
  };

  page.type = async function (sel, text, opts) {
    return _withHumor(opts?.humor, async () => {
      const timeout = opts?.timeout ?? 30000;
      await cognitiveHesitation(brain, page);
      const target = await _interact(sel, timeout);

      await page.mouse.down();
      await sleep(brain.getDelay(20));
      await page.mouse.up();
      await sleep(brain.getDelay(80));

      const input = await isInputElement(page, sel);
      if (!input) return;

      const cdpSession = await page._getCdpSessionForTyping();

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (brain.shouldMakeTypo() && !opts?.noTypos) {
          const wrong = String.fromCharCode(97 + Math.floor(brain._rng() * 26));
          await _dispatchChar(page, cdpSession, brain, wrong);
          await sleep(brain.getTypingDelay() * 0.5);
          await page.keyboard.press('Backspace');
          await sleep(brain.getTypingDelay() * 0.8);
        }
        await _dispatchChar(page, cdpSession, brain, char);
      }
    });
  };

  page.fill = async function (sel, text, opts) {
    return _withHumor(opts?.humor, async () => {
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

      const cdpSession = await page._getCdpSessionForTyping();

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        await _dispatchChar(page, cdpSession, brain, char);
      }
    });
  };

  page.check = async function (sel, opts) {
    const checked = await (cdpWorld ? cdpWorld.evaluate(
      (s) => { const el = document.querySelector(s); return el?.checked ?? false; }, sel,
    ) : pageEvaluate(
      (s) => { const el = document.querySelector(s); return el?.checked ?? false; }, sel,
    ));
    if (!checked) await page.click(sel, opts);
  };

  page.uncheck = async function (sel, opts) {
    const checked = await (cdpWorld ? cdpWorld.evaluate(
      (s) => { const el = document.querySelector(s); return el?.checked ?? false; }, sel,
    ) : pageEvaluate(
      (s) => { const el = document.querySelector(s); return el?.checked ?? false; }, sel,
    ));
    if (checked) await page.click(sel, opts);
  };

  page.press = async function (sel, key, opts) {
    const timeout = opts?.timeout ?? 30000;
    await _interact(sel, timeout);
    const focused = await page._strikeFocused(sel);
    if (!focused) {
      await page.mouse.down();
      await sleep(brain.getDelay(15));
      await page.mouse.up();
      await sleep(brain.getDelay(40));
    }
    await originals.keyboardPress(key);
  };

  page.focus = async function (sel, opts) {
    const timeout = opts?.timeout ?? 30000;
    await _interact(sel, timeout);
    await page.mouse.down();
    await sleep(brain.getDelay(15));
    await page.mouse.up();
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
    cdpWorld?.invalidate();
    await choreographer.reload(opts);
  };

  page.goBack = async function (opts) {
    cdpWorld?.invalidate();
    await choreographer.goBack(opts);
  };

  page.goForward = async function (opts) {
    cdpWorld?.invalidate();
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
    const cdpSession = await page._getCdpSessionForTyping();
    const holdMs = (opts?.keyHold === true || (brain._rng() < 0.3)) ? brain.getKeyHoldDuration?.() ?? 0 : 0;
    for (const char of text) {
      await _dispatchChar(page, cdpSession, brain, char);
    }
  };

  picketLine();
  _patchElementHandles();
  _patchFrames();
  _patchPuppeteer();
}

// ============================================================================
// Context-level patching — apply humor to all pages in a context
// ============================================================================
export function walkOutContext(context, choreographer, brain) {
  // Patch existing pages
  const pages = context.pages();
  for (const p of pages) {
    if (!p._onStrike) walkOut(p, choreographer, brain);
  }

  // Patch new pages created after this call
  const handler = (page) => {
    if (!page._onStrike) walkOut(page, choreographer, brain);
  };
  context.on('page', handler);

  // Set up CdpWorld if not already done
  for (const p of context.pages()) {
    if (p._onStrike && !getCdpWorld()) {
      setCdpWorld(p);
    }
  }

  return () => {
    context.off('page', handler);
  };
}

// ============================================================================
// Browser-level patching — apply humor to all contexts/pages in a browser
// ============================================================================
export function walkOutBrowser(browser, choreographer, brain) {
  const cleanups = [];

  // Patch existing contexts
  const contexts = browser.contexts();
  for (const ctx of contexts) {
    cleanups.push(walkOutContext(ctx, choreographer, brain));
  }

  // Patch new contexts
  const ctxHandler = (context) => {
    cleanups.push(walkOutContext(context, choreographer, brain));
  };
  browser.on('context', ctxHandler);

  return () => {
    browser.off('context', ctxHandler);
    for (const c of cleanups) c();
  };
}

// ============================================================================
// patchBrowser — apply humor to any Playwright Browser object (for CDP-connected users)
// ============================================================================
export function patchBrowser(browser, config = {}) {
  const { EntityBrain } = createRequire(import.meta.url)('../brain/entity.js');
  const { Choreographer } = createRequire(import.meta.url)('../core/choreographer.js');
  const brain = new EntityBrain(config);
  const contexts = browser.contexts();
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const page of pages) {
      const choreographer = new Choreographer(page, brain);
      if (!page._onStrike) walkOut(page, choreographer, brain);
    }
  }
  return { brain, cleanup: () => {} };
}

export { CdpWorld } from './actionability.js';
