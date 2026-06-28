import { CdpWorld } from './cdpworld.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let _cdpWorld = null;

export function setCdpWorld(page) {
  _cdpWorld = new CdpWorld(page);
  return _cdpWorld;
}

export function getCdpWorld() {
  return _cdpWorld;
}

export function clearCdpWorld() {
  if (_cdpWorld) { _cdpWorld.destroy(); _cdpWorld = null; }
}

export async function isInputElement(page, selector) {
  if (_cdpWorld) {
    return _cdpWorld.evaluate(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const tag = el.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || el.getAttribute('contenteditable') === 'true';
      },
      selector,
    );
  }
  return page.evaluate(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.getAttribute('contenteditable') === 'true';
    },
    selector,
  );
}

export async function waitStable(page, selector, timeout) {
  const deadline = Date.now() + timeout;
  let prev = null;
  for (let i = 0; i < 20 && Date.now() < deadline; i++) {
    const box = await page.locator(selector).first().boundingBox().catch(() => null);
    if (!box) {
      await sleep(100);
      continue;
    }
    if (prev) {
      const stable = Math.abs(box.x - prev.x) + Math.abs(box.y - prev.y)
        + Math.abs(box.width - prev.width) + Math.abs(box.height - prev.height) < 2;
      if (stable) return true;
    }
    prev = box;
    await sleep(100);
  }
  return false;
}

export async function checkPointerEvents(page, selector, x, y) {
  if (_cdpWorld) {
    return _cdpWorld.evaluate(
      ({ sel, px, py }) => {
        const top = document.elementFromPoint(px, py);
        if (!top) return false;
        const target = document.querySelector(sel);
        if (!target) return false;
        return top === target || target.contains(top) || top.contains(target);
      },
      { sel: selector, px: Math.round(x), py: Math.round(y) },
    );
  }
  return page.evaluate(
    ({ sel, px, py }) => {
      const top = document.elementFromPoint(px, py);
      if (!top) return false;
      const target = document.querySelector(sel);
      if (!target) return false;
      return top === target || target.contains(top) || top.contains(target);
    },
    { sel: selector, px: Math.round(x), py: Math.round(y) },
  );
}

export { CdpWorld };
