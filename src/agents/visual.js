// Visual — regression testing, screenshot diffing, baseline management

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export class Visual {
  constructor(page, baselineDir = '.visual') {
    this.page = page;
    this.baselineDir = baselineDir;
    this.diffThreshold = 0.1; // 10% difference
  }

  async capture(name) {
    if (!existsSync(this.baselineDir)) {
      await mkdir(this.baselineDir, { recursive: true });
    }
    const buffer = await this.page.screenshot({ fullPage: true });
    return { name, buffer, timestamp: Date.now() };
  }

  async saveBaseline(name, buffer) {
    await writeFile(`${this.baselineDir}/${name}.png`, buffer);
    return { saved: true, name };
  }

  async compare(name, currentBuffer) {
    const baselinePath = `${this.baselineDir}/${name}.png`;
    if (!existsSync(baselinePath)) {
      return { diff: null, match: false, reason: 'no-baseline' };
    }
    const baseline = await readFile(baselinePath);
    // Simple byte diff ratio
    const diff = this._calculateDiff(baseline, currentBuffer);
    return { diff, match: diff < this.diffThreshold, threshold: this.diffThreshold };
  }

  _calculateDiff(a, b) {
    const len = Math.min(a.length, b.length);
    let diff = 0;
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) diff++;
    }
    return diff / len;
  }

  async ensure(name) {
    const current = await this.capture(name);
    const result = await this.compare(name, current.buffer);
    if (!result.match) {
      await this.saveBaseline(name, current.buffer);
      return { ...result, created: true };
    }
    return { ...result, created: false };
  }
}
