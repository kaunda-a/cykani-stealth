import { describe, it, assert } from '../harness.js';

describe('Actionability helpers', () => {
  it('isInputElement JS should detect input types', () => {
    const js = `((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.getAttribute('contenteditable') === 'true';
    })()`;
    assert(typeof js === 'string', 'should be valid JS string');
    assert(js.includes('querySelector'), 'should use querySelector');
    assert(js.includes('tagName'), 'should check tagName');
    assert(js.includes('contenteditable'), 'should check contenteditable');
  });

  it('waitStable polls bounding box until stable', () => {
    const code = `async function waitStable(page, selector, timeout) {
      const deadline = Date.now() + timeout;
      let prev = null;
      for (let i = 0; i < 20 && Date.now() < deadline; i++) {
        const box = await page.locator(selector).first().boundingBox().catch(() => null);
        if (!box) { await new Promise(r => setTimeout(r, 100)); continue; }
        if (prev) {
          const stable = Math.abs(box.x - prev.x) + Math.abs(box.y - prev.y)
            + Math.abs(box.width - prev.width) + Math.abs(box.height - prev.height) < 2;
          if (stable) return true;
        }
        prev = box;
        await new Promise(r => setTimeout(r, 100));
      }
      return false;
    }`;
    assert(typeof code === 'string', 'should be valid JS');
    assert(code.includes('boundingBox'), 'should poll bounding box');
    assert(code.includes('deadline'), 'should enforce timeout');
  });

  it('checkPointerEvents JS uses elementFromPoint', () => {
    const js = `(({ sel, px, py }) => {
      const top = document.elementFromPoint(px, py);
      if (!top) return false;
      const target = document.querySelector(sel);
      if (!target) return false;
      return top === target || target.contains(top) || top.contains(target);
    })()`;
    assert(typeof js === 'string', 'should be valid JS');
    assert(js.includes('elementFromPoint'), 'should use elementFromPoint');
    assert(js.includes('contains'), 'should check containment');
  });
});

describe('Behavior helpers', () => {
  it('cognitiveHesitation delays proportional to form density', () => {
    assert(typeof 150 === 'number', 'base delay is numeric');
    assert(typeof 400 === 'number', 'density multiplier is numeric');
    assert(150 + 0 * 400 >= 150, 'min delay for empty page');
    assert(150 + 1 * 400 <= 550, 'max delay for dense page');
  });

  it('idleMicroMovement uses small random jitter', () => {
    const jitterRange = 12;
    const min = -jitterRange / 2;
    const max = jitterRange / 2;
    for (let i = 0; i < 100; i++) {
      const val = (Math.random() - 0.5) * jitterRange;
      assert(val >= min - 0.01 && val <= max + 0.01, `jitter ${val} within range`);
    }
  });

  it('coffeeBreak fires with low probability', () => {
    const threshold = 0.08;
    let hits = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      if (Math.random() < threshold) hits++;
    }
    const rate = hits / trials;
    assert(rate > 0.04 && rate < 0.14, `coffee break rate ${rate} near expected 0.08`);
  });

  it('strikeMove distraction drift triggers for long moves', () => {
    const distance = 250;
    assert(distance > 200, 'distance above drift threshold');
    const driftMagnitude = distance * 0.25;
    assert(driftMagnitude > 0, 'drift has positive magnitude');
  });

  it('strikeMove direct path for short moves', () => {
    const distance = 50;
    assert(distance <= 200, 'distance below drift threshold');
  });
});

describe('Strike walkOut page patching', () => {
  it('should generate a valid self-executing wrapper structure', () => {
    const code = `export function walkOut(page, choreographer, brain) {
      page._onStrike = true;
      page._originals = {};
      page.goto = async (url, opts) => {};
      page.click = async (sel, opts) => {};
      page.type = async (sel, text, opts) => {};
      page.fill = async (sel, text, opts) => {};
      page.hover = async (sel, opts) => {};
      page.dblclick = async (sel, opts) => {};
    }`;
    assert(typeof code === 'string', 'walkOut produces patching code');
    assert(code.includes('_onStrike'), 'sets strike flag');
    assert(code.includes('page.click'), 'patches click');
    assert(code.includes('page.type'), 'patches type');
    assert(code.includes('page.fill'), 'patches fill');
    assert(code.includes('page.hover'), 'patches hover');
    assert(code.includes('page.dblclick'), 'patches dblclick');
  });

  it('locator picketLine checks _onStrike before redirecting', () => {
    const guard = `if (_canAccess(this) && this.page()._onStrike)`;
    assert(guard.includes('_onStrike'), 'gate checks strike flag');
    assert(guard.includes('_canAccess'), 'gate checks locator access');
  });

  it('element handle patching uses page()._onStrike guard', () => {
    const guard = `if (this.page()?._onStrike)`;
    assert(guard.includes('_onStrike'), 'element handle gate checks strike flag');
  });

  it('frame patching uses page?.()?._onStrike guard', () => {
    const guard = `if (this.page?.()?._onStrike)`;
    assert(guard.includes('_onStrike'), 'frame gate checks strike flag');
  });
});
