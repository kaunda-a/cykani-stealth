import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

export class SessionState {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { cookies: [], localStorage: {}, sessionStorage: {}, origin: '' };
  }

  async load() {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(raw);
    } catch {}
  }

  async persist(data) {
    if (data) this.data = data;
    if (!this.filePath) return;
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async importFromPage(page) {
    const result = await page.evaluate(() => {
      const ls = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        ls[k] = localStorage.getItem(k);
      }
      const ss = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        ss[k] = sessionStorage.getItem(k);
      }
      return {
        origin: location.origin,
        localStorage: ls,
        sessionStorage: ss,
      };
    }).catch(() => ({ origin: '', localStorage: {}, sessionStorage: {} }));

    try {
      const cookies = await page.context().cookies();
      result.cookies = cookies;
    } catch {}

    this.data = { ...this.data, ...result };
    if (this.filePath) await this.persist();
    return this.data;
  }

  async exportToPage(page) {
    if (!this.data.origin && !this.data.cookies.length) return;

    // Restore localStorage
    await page.evaluate((ls) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(ls)) {
        if (v != null) localStorage.setItem(k, v);
      }
    }, this.data.localStorage).catch(() => {});

    // Restore sessionStorage
    await page.evaluate((ss) => {
      sessionStorage.clear();
      for (const [k, v] of Object.entries(ss)) {
        if (v != null) sessionStorage.setItem(k, v);
      }
    }, this.data.sessionStorage).catch(() => {});

    // Restore cookies
    if (this.data.cookies.length > 0) {
      try {
        await page.context().addCookies(this.data.cookies.map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain || new URL(this.data.origin || 'https://example.com').hostname,
          path: c.path || '/',
          httpOnly: c.httpOnly ?? false,
          secure: c.secure ?? false,
          sameSite: c.sameSite || 'Lax',
          expires: c.expires ? Math.floor(c.expires) : undefined,
        })));
      } catch {}
    }
  }

  diff(other) {
    const current = other || this.data;
    const changes = [];
    if (this.data.cookies.length !== current.cookies.length) changes.push('cookies count changed');
    const lsKeys = Object.keys(this.data.localStorage).sort().join(',');
    const otherLsKeys = Object.keys(current.localStorage).sort().join(',');
    if (lsKeys !== otherLsKeys) changes.push('localStorage keys changed');
    return changes;
  }
}
