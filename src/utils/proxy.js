// Proxy — advanced proxy handling with authentication and rotation

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
  constructor() {
    this.proxies = [];
    this.index = 0;
    this.health = new Map();
  }

  addProxy(url, opts = {}) {
    this.proxies.push({ url, ...opts });
    this.health.set(url, { failures: 0, successes: 0 });
  }

  getNext() {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.index % this.proxies.length];
    this.index++;
    return proxy.url;
  }

  recordSuccess(url) {
    const h = this.health.get(url) || { failures: 0, successes: 0 };
    h.successes++;
    this.health.set(url, h);
  }

  recordFailure(url) {
    const h = this.health.get(url) || { failures: 0, successes: 0 };
    h.failures++;
    this.health.set(url, h);
  }

  getHealth(url) {
    const h = this.health.get(url) || { failures: 0, successes: 0 };
    const total = h.failures + h.successes;
    return total === 0 ? 1 : h.successes / total;
  }
}
