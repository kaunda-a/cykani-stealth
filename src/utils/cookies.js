// Cookie jar with realistic domain-matching, expiration, and session affinity

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

export class CookieJar {
  constructor(filePath) {
    this.store = new Map();
    this.filePath = filePath;
  }

  async load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const data = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      for (const [key, val] of Object.entries(parsed)) {
        this.store.set(key, val);
      }
    } catch (_) {}
  }

  async persist() {
    if (!this.filePath) return;
    const obj = Object.fromEntries(this.store);
    await writeFile(this.filePath, JSON.stringify(obj, null, 2));
  }

  set(url, cookie) {
    const domain = new URL(url).hostname;
    const key = this._key(domain, cookie.name);
    this.store.set(key, {
      ...cookie,
      domain,
      createdAt: Date.now(),
    });
  }

  get(url) {
    const host = new URL(url).hostname;
    const matches = [];
    for (const [key, cookie] of this.store) {
      if (host === cookie.domain || host.endsWith('.' + cookie.domain)) {
        if (cookie.expires && cookie.expires < Date.now()) {
          this.store.delete(key);
          continue;
        }
        matches.push(cookie);
      }
    }
    return matches;
  }

  toHeaderString(url) {
    return this.get(url).map((c) => `${c.name}=${c.value}`).join('; ');
  }

  clear(domain) {
    if (!domain) {
      this.store.clear();
      return;
    }
    for (const [key, cookie] of this.store) {
      if (cookie.domain === domain || cookie.domain.endsWith('.' + domain)) {
        this.store.delete(key);
      }
    }
  }

  /** Import cookies from a Playwright BrowserContext into the jar */
  async importFromContext(context) {
    try {
      const cookies = await context.cookies();
      for (const c of cookies) {
        this.set(`https://${c.domain}`, { name: c.name, value: c.value });
      }
      return cookies.length;
    } catch {
      return 0;
    }
  }

  /** Export jar cookies to a Playwright BrowserContext */
  async exportToContext(context) {
    const all = [];
    for (const [, cookie] of this.store) {
      all.push({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      });
    }
    if (all.length > 0) {
      try { await context.addCookies(all); } catch {}
    }
    return all.length;
  }

  _key(domain, name) {
    return `${domain}:${name}`;
  }
}
