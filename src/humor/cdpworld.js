export class CdpWorld {
  constructor(page) {
    this._page = page;
    this._session = null;
    this._contextId = null;
    this._valid = false;
    this._navigated = () => { this._valid = false; this._contextId = null; };
  }

  async _ensure() {
    if (this._valid && this._session && this._contextId) return true;
    try {
      if (!this._session) {
        this._session = await this._page.context().newCDPSession(this._page);
        this._session.on('Page.frameNavigated', this._navigated);
      }
      const worldName = 'cykani_stealth_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
      const { executionContextId } = await this._session.send('Page.createIsolatedWorld', {
        worldName,
        grantUniveralAccess: false,
      });
      this._contextId = executionContextId;
      this._valid = true;
      return true;
    } catch {
      this._valid = false;
      this._contextId = null;
      return false;
    }
  }

  async evaluate(fn, ...args) {
    const ready = await this._ensure();
    if (!ready) return this._page.evaluate(fn, ...args);
    const serialized = args.map(a => {
      if (typeof a === 'string') return JSON.stringify(a);
      if (typeof a === 'number' || typeof a === 'boolean') return String(a);
      if (a === null) return 'null';
      if (typeof a === 'object') return JSON.stringify(a);
      return String(a);
    });
    const expression = `(${fn.toString()})(${serialized.join(',')})`;
    try {
      const result = await this._session.send('Runtime.evaluate', {
        expression, contextId: this._contextId, returnByValue: true, awaitPromise: true,
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'CDP evaluation error');
      return result.result.value;
    } catch (e) {
      if (e.message?.includes('Cannot find context') || e.message?.includes('target closed')) {
        this._valid = false; this._contextId = null;
        return this._page.evaluate(fn, ...args);
      }
      throw e;
    }
  }

  invalidate() { this._valid = false; this._contextId = null; }

  async destroy() {
    if (this._session) {
      try { await this._session.detach(); } catch {}
      this._session = null; this._valid = false; this._contextId = null;
    }
  }
}
