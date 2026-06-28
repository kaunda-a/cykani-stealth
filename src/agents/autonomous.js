function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export class Autonomous {
  constructor(page, choreographer) {
    this.page = page;
    this.choreographer = choreographer;
    this.phase = 'initial';
    this.knownUrls = new Set();
    this.pageType = null;
    this._lastAction = null;
    this.cycleCount = 0;
  }

  async analyze() {
    this.cycleCount++;
    const url = this.page.url();
    this.knownUrls.add(url);
    this._lastAction = 'analyze';

    const analysis = await this.page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input:not([type="hidden"])');
      const pw = document.querySelectorAll('input[type="password"]');
      const emails = document.querySelectorAll('input[type="email"], input[name*="email" i], input[id*="email" i]');
      const searchB = document.querySelectorAll('input[type="search"], input[name*="search" i], input[id*="search" i]');
      const buttons = document.querySelectorAll('button, input[type="submit"], a[role="button"]');
      const articles = document.querySelectorAll('article, [role="article"], .post, .entry, [itemprop="articleBody"]');
      const listings = document.querySelectorAll('[role="list"], .listing, .results, .grid > *, [data-item]');
      const links = document.querySelectorAll('a[href]:not([href*="#"])');
      const textLen = (document.body?.innerText || '').length;
      const headings = document.querySelectorAll('h1, h2, h3');

      const loginForm = pw.length > 0;
      const searchForm = searchB.length > 0;
      const signupForm = emails.length > 0 && Array.from(buttons).some(b =>
        /sign\s*up|register|create/i.test(b.textContent || ''),
      );
      const isArticle = articles.length > 0 || (headings.length > 0 && textLen > 500);
      const isListing = listings.length > 5 || links.length > 30;
      const isSparse = textLen < 200 && links.length < 5;
      const isCaptcha = document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], [class*="captcha"]');
      const hasSidebar = document.querySelector('aside, [role="complementary"], .sidebar');
      const hasNav = document.querySelector('nav, [role="navigation"], .pagination, .pager');
      const visibleLinks = Array.from(links).filter(l => l.offsetParent !== null).length;

      return {
        formCount: forms.length, inputCount: inputs.length,
        hasPassword: loginForm, hasEmail: emails.length > 0,
        hasSearch: searchForm, hasSignup: signupForm,
        isArticle, isListing, isSparse, isCaptcha: !!isCaptcha,
        hasSidebar: !!hasSidebar, hasNav: !!hasNav,
        textLen, linkCount: links.length, visibleLinks,
        headingCount: headings.length, buttonCount: buttons.length,
        title: document.title,
      };
    });

    this.pageAnalysis = analysis;

    if (analysis.isCaptcha) this.pageType = 'captcha';
    else if (analysis.hasPassword) this.pageType = 'login';
    else if (analysis.hasSignup) this.pageType = 'signup';
    else if (analysis.hasSearch) this.pageType = 'search';
    else if (analysis.isArticle) this.pageType = 'article';
    else if (analysis.isListing) this.pageType = 'listing';
    else if (analysis.isSparse) this.pageType = 'sparse';
    else this.pageType = 'generic';

    return analysis;
  }

  async act(durationMs = 30000) {
    const deadline = Date.now() + durationMs;

    while (Date.now() < deadline) {
      await this.analyze();
      const action = this._pickAction();
      const started = Date.now();

      try {
        await action();
      } catch {
        if (Date.now() - started < 1000) {
          await this.choreographer.goBack();
          await sleep(1500 + Math.random() * 1500);
        }
      }

      await sleep(400 + Math.random() * 1200);

      if (this.cycleCount > 0 && this.cycleCount % 4 === 0) {
        await this.choreographer.idle(2000 + Math.random() * 3000);
      }
    }
  }

  _pickAction() {
    const a = this.pageAnalysis;
    if (!a) return () => this._scroll();

    const roll = Math.random();

    switch (this.pageType) {
      case 'captcha':
        return () => this._idleLong();
      case 'login':
        return roll < 0.4 ? () => this._scroll() : () => this._scrollForm();
      case 'signup':
        return roll < 0.3 ? () => this._scroll() : () => this._scrollForm();
      case 'search':
        return roll < 0.3 ? () => this._idle() : () => this._clickLink();
      case 'article':
        return roll < 0.5 ? () => this._scrollRead() : roll < 0.7 ? () => this._clickLink() : () => this._idle();
      case 'listing':
        return roll < 0.35 ? () => this._scroll() : roll < 0.6 ? () => this._clickLink() : roll < 0.8 ? () => this._scroll() : () => this._idle();
      case 'sparse':
        return roll < 0.4 ? () => this._idle() : roll < 0.7 ? () => this._scroll() : () => this.choreographer.goBack();
      default:
        return roll < 0.3 ? () => this._scroll() : roll < 0.55 ? () => this._clickLink() : roll < 0.75 ? () => this._hoverLink() : () => this._idle();
    }
  }

  async _scroll() {
    const vh = await this.page.evaluate(() => window.innerHeight);
    const dir = Math.random() < 0.5 ? 'down' : 'up';
    const amount = vh * (0.3 + Math.random() * 0.5);
    await this.choreographer.scroll({ direction: dir, amount });
    await this.choreographer.idle(500 + Math.random() * 1500);
    this._lastAction = 'scroll';
  }

  async _scrollRead() {
    const vh = await this.page.evaluate(() => window.innerHeight);
    await this.choreographer.scroll({ direction: 'down', amount: vh * 0.7 });
    await sleep(300 + Math.random() * 600);
    await this.choreographer.scroll({ direction: 'down', amount: vh * 0.3 });
    await this.choreographer.idle(1500 + Math.random() * 2500);
    this._lastAction = 'scrollRead';
  }

  async _scrollForm() {
    await this.choreographer.scroll({ direction: 'down', amount: 150 + Math.random() * 200 });
    await this.choreographer.idle(600 + Math.random() * 1000);
    this._lastAction = 'scrollForm';
  }

  async _clickLink() {
    const links = await this.page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a[href]'));
      const visible = all.filter(l => l.offsetParent !== null && l.href && !l.href.startsWith('#') && !l.href.startsWith('javascript:'));
      return visible.slice(0, 30).map(l => ({
        href: l.href,
        text: (l.innerText || '').trim().slice(0, 60),
        tag: l.tagName,
      }));
    });
    if (links.length === 0) return this._scroll();

    const weights = links.map((l, i) => ({ idx: i, w: links.length - i }));
    const total = weights.reduce((s, w) => s + w.w, 0);
    let r = Math.random() * total;
    const picked = weights.find((w) => { r -= w.w; return r <= 0; }) || weights[0];

    const link = links[picked.idx];
    try {
      await this.choreographer.evaluate((href) => {
        const found = Array.from(document.querySelectorAll('a[href]')).find(l => l.href === href);
        if (found) found.scrollIntoView({ block: 'center' });
      }, link.href);
      await sleep(200 + Math.random() * 300);
      await this.choreographer.goto(link.href);
      this._lastAction = 'clickLink';
    } catch {
      await this._scroll();
    }
  }

  async _hoverLink() {
    const links = await this.page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a[href], button, [role="button"]'));
      const visible = all.filter(l => l.offsetParent !== null);
      if (visible.length === 0) return [];
      const el = visible[Math.floor(Math.random() * visible.length)];
      return [el.innerText?.trim().slice(0, 60) || ''];
    });
    if (links.length === 0) return;
    const text = links[0];
    if (text) {
      try {
        await this.choreographer.hover(`text=${text}`);
        await sleep(1000 + Math.random() * 2000);
        this._lastAction = 'hoverLink';
      } catch {
        // fallback hover on first link
      }
    }
  }

  async _idle() {
    await this.choreographer.idle(1500 + Math.random() * 2500);
    this._lastAction = 'idle';
  }

  async _idleLong() {
    await this.choreographer.idle(5000 + Math.random() * 5000);
    this._lastAction = 'idleLong';
  }
}
