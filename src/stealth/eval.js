// StealthEval — CDP Isolated World for undetectable DOM reads
// Mirrors CloakBrowser's StealthEval: Page.createIsolatedWorld
// Page.evaluate is detectable (leaves stack traces) — isolated world is invisible.

import { sleep } from '../utils/helpers.js';

export class StealthEval {
  constructor(page) {
    this.page = page;
    this.cdp = null;
    this.contextId = null;
  }

  async ensureCdp() {
    if (!this.cdp) {
      this.cdp = await this.page.context().newCDPSession(this.page);
    }
    return this.cdp;
  }

  async createWorld() {
    const cdp = await this.ensureCdp();
    const tree = await cdp.send('Page.getFrameTree');
    const frameId = tree.frameTree.frame?.id;
    if (!frameId) throw new Error('No frame ID available');

    const result = await cdp.send('Page.createIsolatedWorld', {
      frameId,
      worldName: '',
      grantUniversalAccess: true,
    });
    this.contextId = result.executionContextId;
    return this.contextId;
  }

  /** Evaluate in isolated world (invisible to page JS). Auto-re-creates context on invalidation. */
  async evaluate(expression) {
    if (this.contextId === null) {
      await this.createWorld();
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const cdp = await this.ensureCdp();
        const result = await cdp.send('Runtime.evaluate', {
          expression,
          contextId: this.contextId,
          returnByValue: true,
        });
        if (result.exceptionDetails) {
          if (attempt === 0) {
            await this.createWorld();
            continue;
          }
          return undefined;
        }
        return result.result?.value;
      } catch {
        if (attempt === 0) {
          this.contextId = null;
          await this.createWorld().catch(() => {});
          continue;
        }
        return undefined;
      }
    }
    return undefined;
  }

  invalidate() {
    this.contextId = null;
  }

  /** Lazy CDP session for Input.dispatchKeyEvent etc. */
  async getCdpSession() {
    return this.ensureCdp();
  }

  /** Dispatch keyboard events via CDP (isTrusted=true). */
  async dispatchKey(key, type = 'keyDown', modifiers = 0) {
    const cdp = await this.ensureCdp();
    await cdp.send('Input.dispatchKeyEvent', {
      type,
      key,
      modifiers,
      windowsVirtualKeyCode: key.codePointAt(0),
      text: key,
      unmodifiedText: key,
    });
  }
}
