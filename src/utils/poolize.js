// Poolize — session pool with health-aware proxy rotation and load balancing

export class Poolize {
  constructor(opts = {}) {
    this.maxSessions = opts.maxSessions ?? 10;
    this.sessions = new Map(); // id -> session
    this.proxies = opts.proxies ?? []; // array of proxy strings
    this.proxyHealth = new Map(); // proxy -> { failures, successes, lastChecked }
    this.rotationStrategy = opts.rotationStrategy ?? 'roundrobin'; // roundrobin, least-connections, random, health-aware
    this.proxyIndex = 0;
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
      // prefer proxies with lowest failure rate
      const healthy = this.proxies
        .map((p) => ({
          url: p,
          health: this._getProxyHealth(p),
        }))
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

  async drain(timeout = 30000) {
    const ids = Array.from(this.sessions.keys());
    await Promise.race([
      Promise.all(ids.map((id) => this.sessions.get(id)?.close?.())),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Pool drain timeout')), timeout)),
    ]);
    this.sessions.clear();
  }
}
