// Diagnostic — verify stealth is correctly applied

export class Diagnostic {
  constructor(page) {
    this.page = page;
    this.results = {};
  }

  async runAll() {
    await this.checkWebDriver();
    await this.checkPlugins();
    await this.checkLanguages();
    await this.checkCanvas();
    await this.checkWebGL();
    await this.checkScreenConsistency();
    return this.results;
  }

  async checkWebDriver() {
    const webdriver = await this.page.evaluate(() => navigator.webdriver);
    this.results.webdriver = { value: webdriver, safe: webdriver === undefined };
  }

  async checkPlugins() {
    const plugins = await this.page.evaluate(() => ({
      length: navigator.plugins.length,
      hasChromePDF: Array.from(navigator.plugins).some((p) => p.name?.includes('PDF')),
    }));
    this.results.plugins = { ...plugins, safe: plugins.length >= 3 };
  }

  async checkLanguages() {
    const lang = await this.page.evaluate(() => ({
      locale: navigator.language,
      languages: navigator.languages,
    }));
    this.results.languages = { ...lang, safe: Array.isArray(lang.languages) && lang.languages.length > 1 };
  }

  async checkCanvas() {
    const canvas = await this.page.evaluate(() => {
      try {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        return ctx.getImageData(0, 0, 1, 1).data[0];
      } catch { return null; }
    });
    this.results.canvas = { readable: canvas !== null, safe: canvas !== 0 };
  }

  async checkWebGL() {
    const gl = await this.page.evaluate(() => {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl') || c.getContext('webgl2');
        return gl.getParameter(37445);
      } catch { return null; }
    });
    this.results.webgl = { vendor: gl, safe: gl === null || gl === 'Intel Inc.' };
  }

  async checkScreenConsistency() {
    const screenInfo = await this.page.evaluate(() => ({
      screen: { width: screen.width, height: screen.height },
      avail: { width: screen.availWidth, height: screen.availHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }));
    const ratio = screenInfo.screen.width / screenInfo.screen.height;
    this.results.screen = { ...screenInfo, ratio, safe: Math.abs(ratio - 16 / 9) < 0.1 };
  }

  report() {
    const total = Object.keys(this.results).length;
    const safe = Object.values(this.results).filter((r) => r.safe).length;
    return {
      score: safe / total,
      results: this.results,
      timestamp: Date.now(),
    };
  }
}