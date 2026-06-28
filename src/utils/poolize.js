// Poolize — session pool with health-aware proxy rotation, load balancing, and auto-recovery

export class Poolize {
  constructor(opts = {}) {
    this.maxSessions = opts.maxSessions ?? 10;
    this.sessions = new Map(); // id -> session
    this.proxies = opts.proxies ?? []; // array of proxy strings
    this.proxyHealth = new Map(); // proxy -> { failures, successes, lastChecked }
    this.rotationStrategy = opts.rotationStrategy ?? 'roundrobin'; // roundrobin, least-connections, random, health-aware
    this.proxyIndex = 0;
    this.autoRecover = opts.autoRecover ?? true;
    this.recoveryInterval = opts.recoveryInterval ?? 30000;
    this.maxFailures = opts.maxFailures ?? 3;
    this.factory = opts.factory ?? null;
    this.onRecover = opts.onRecover ?? null; // callback(id, newSession)
    if (this.autoRecover) this._startRecovery();
  }

  addProxy(proxyUrl) {
    this.proxies.push(proxyUrl);
    this.proxyHealth.set(proxyUrl, { failures: 0, successes: 0, lastChecked: Date.now() });
  }

  removeProxy(proxyUrl) {
    this.proxies = this.proxies.filter((p) => p !== proxyUrl);
    this.proxyHealth.delete(proxyUrl);
  }

  getNextProxy() {
    if (this.proxies.length === 0) return undefined;

    if (this.rotationStrategy === 'random') {
      return this.proxies[Math.floor(Math.random() * this.proxies.length)];
    }

    if (this.rotationStrategy === 'health-aware') {
      const healthy = this.proxies
        .map((p) => ({ url: p, health: this._getProxyHealth(p) }))
        .sort((a, b) => b.health - a.health);
      return healthy[0]?.url;
    }

    // roundrobin default
    const proxy = this.proxies[this.proxyIndex % this.proxies.length];
    this.proxyIndex++;
    return proxy;
  }

  _getProxyHealth(proxyUrl) {
    const health = this.proxyHealth.get(proxyUrl) || { failures: 0, successes: 0 };
    const total = health.failures + health.successes;
    if (total === 0) return 1;
    return health.successes / total;
  }

  recordSuccess(proxyUrl) {
    const h = this.proxyHealth.get(proxyUrl) || { failures: 0, successes: 0 };
    h.successes++;
    h.lastChecked = Date.now();
    this.proxyHealth.set(proxyUrl, h);
  }

  recordFailure(proxyUrl) {
    const h = this.proxyHealth.get(proxyUrl) || { failures: 0, successes: 0 };
    h.failures++;
    h.lastChecked = Date.now();
    this.proxyHealth.set(proxyUrl, h);
  }

  register(id, session) {
    this.sessions.set(id, session);
  }

  unregister(id) {
    this.sessions.delete(id);
  }

  getHealthySessions() {
    return Array.from(this.sessions.values()).filter((s) => !s.broken);
  }

  markBroken(id, reason = 'unknown') {
    const session = this.sessions.get(id);
    if (session) {
      session.broken = true;
      session.brokenAt = Date.now();
      session.brokenReason = reason;
      if (this.autoRecover) this._queueRecovery(id);
    }
  }

  _recoveryQueue = new Set();

  _queueRecovery(id) {
    this._recoveryQueue.add(id);
  }

  _startRecovery() {
    this._recoveryTimer = setInterval(() => {
      this._processRecovery();
    }, this.recoveryInterval);
  }

  async _processRecovery() {
    for (const id of this._recoveryQueue) {
      this._recoveryQueue.delete(id);
      try {
        const oldSession = this.sessions.get(id);
        if (!oldSession) continue;

        // Attempt to create replacement session
        const newSession = await this._recoverSession(id, oldSession);
        if (newSession) {
          this.sessions.set(id, newSession);
          if (this.onRecover) this.onRecover(id, newSession);
        }
      } catch (err) {
        // Re-queue for later retry
        this._recoveryQueue.add(id);
      }
    }
  }

  async _recoverSession(id, oldSession) {
    if (this.factory) {
      return this.factory(id, oldSession);
    }
    return null;
  }

  stopRecovery() {
    if (this._recoveryTimer) {
      clearInterval(this._recoveryTimer);
      this._recoveryTimer = null;
    }
  }

  async drain(timeout = 30000) {
    this.stopRecovery();
    const ids = Array.from(this.sessions.keys());
    await Promise.race([
      Promise.all(ids.map((id) => this.sessions.get(id)?.close?.())),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Pool drain timeout')), timeout)),
    ]);
    this.sessions.clear();
    this._recoveryQueue.clear();
  }
}
