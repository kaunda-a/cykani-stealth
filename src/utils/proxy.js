// Proxy — advanced proxy handling with authentication, rotation, and health checks

export function resolveProxyConfig(proxy) {
  if (!proxy) return { proxyOption: null, proxyArgs: [] };

  const isAuth = proxy.includes('@');
  const proxyArg = isAuth ? proxy : proxy;

  return {
    proxyOption: isAuth ? { server: proxy } : null,
    proxyArgs: [`--proxy-server=${proxy}`],
  };
}

export class ProxyManager {
  constructor(opts = {}) {
    this.proxies = [];
    this.index = 0;
    this.health = new Map();
    this.healthCheckUrl = opts.healthCheckUrl ?? 'https://httpbin.org/ip';
    this.healthCheckTimeout = opts.healthCheckTimeout ?? 15000;
    this.maxFailures = opts.maxFailures ?? 5;
    this.cooldownMs = opts.cooldownMs ?? 60000;
  }

  addProxy(url, opts = {}) {
    this.proxies.push({ url, active: true, ...opts });
    this.health.set(url, { failures: 0, successes: 0, lastUsed: 0, cooldownUntil: 0 });
  }

  removeProxy(url) {
    this.proxies = this.proxies.filter((p) => p.url !== url);
    this.health.delete(url);
  }

  getNext() {
    if (this.proxies.length === 0) return null;
    const now = Date.now();

    // Filter out proxies in cooldown
    const available = this.proxies.filter((p) => {
      const h = this.health.get(p.url);
      return p.active && (!h || now > h.cooldownUntil);
    });

    if (available.length === 0) {
      // All proxies in cooldown, pick least recently used
      const sorted = [...this.proxies].sort((a, b) => {
        const ha = this.health.get(a.url)?.lastUsed ?? 0;
        const hb = this.health.get(b.url)?.lastUsed ?? 0;
        return ha - hb;
      });
      if (sorted.length === 0) return null;
      const proxy = sorted[0];
      this._updateLastUsed(proxy.url);
      return proxy.url;
    }

    // Round-robin with health weighting
    const proxy = available[this.index % available.length];
    this.index++;
    this._updateLastUsed(proxy.url);
    return proxy.url;
  }

  _updateLastUsed(url) {
    const h = this.health.get(url);
    if (h) {
      h.lastUsed = Date.now();
      this.health.set(url, h);
    }
  }

  recordSuccess(url) {
    const h = this.health.get(url) || { failures: 0, successes: 0 };
    h.successes++;
    h.failures = Math.max(0, h.failures - 1); // decay failures on success
    h.lastUsed = Date.now();
    this.health.set(url, h);
  }

  recordFailure(url) {
    const h = this.health.get(url) || { failures: 0, successes: 0 };
    h.failures++;
    if (h.failures >= this.maxFailures) {
      h.cooldownUntil = Date.now() + this.cooldownMs;
    }
    h.lastUsed = Date.now();
    this.health.set(url, h);
  }

  async healthCheck(url, opts = {}) {
    try {
      const res = await fetch(this.healthCheckUrl, {
        ...opts,
        signal: AbortSignal.timeout(this.healthCheckTimeout),
      });
      if (res.ok) {
        this.recordSuccess(url);
        return true;
      }
    } catch { /* ignore */ }
    this.recordFailure(url);
    return false;
  }

  async checkAll(opts = {}) {
    const results = await Promise.all(
      this.proxies.map(async (p) => {
        const ok = await this.healthCheck(p.url, opts);
        return { url: p.url, ok, health: this.getHealth(p.url) };
      })
    );
    return results;
  }

  getHealth(url) {
    const h = this.health.get(url) || { failures: 0, successes: 0 };
    const total = h.failures + h.successes;
    if (total === 0) return 1;
    return h.successes / total;
  }

  getStatus() {
    return this.proxies.map((p) => ({
      url: p.url,
      active: p.active,
      health: this.getHealth(p.url),
      ...this.health.get(p.url),
    }));
  }
}
