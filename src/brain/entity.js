// Entity behavior engine — physics-based strike behavior

import { createSeededRng } from '../utils/helpers.js';

function lerp(a, b, t) { return a + (b - a) * t; }

function clamp(min, max, val) { return Math.max(min, Math.min(max, val)); }

// Cubic Bezier easing
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// Distance between two points
function dist(p0, p1) { return Math.hypot(p1.x - p0.x, p1.y - p0.y); }

// Cubic Bezier at t
function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t; const u3 = u * u * u; const t3 = t * t * t;
  const B0 = u3; const B1 = 3 * u * u * t; const B2 = 3 * u * t * t; const B3 = t3;
  return {
    x: B0 * p0.x + B1 * p1.x + B2 * p2.x + B3 * p3.x,
    y: B0 * p0.y + B1 * p1.y + B2 * p2.y + B3 * p3.y,
  };
}

// Random control points for natural curves
function randomControlPoints(start, end, rng) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const bias1 = (rng() - 0.5) * len * 0.3;
  const bias2 = (rng() - 0.5) * len * 0.3;
  return [
    { x: start.x + dx * 0.25 + px * bias1, y: start.y + dy * 0.25 + py * bias1 },
    { x: start.x + dx * 0.75 + px * bias2, y: start.y + dy * 0.75 + py * bias2 },
  ];
}

export class EntityBrain {
  constructor(entity = {}) {
    this.entity = entity;
    this._seed = entity.fingerprint ?? 7;
    this._rng = createSeededRng(this._seed + 1);
    this._rng2 = createSeededRng(this._seed + 9999);
    this._rng3 = createSeededRng(this._seed + 55555);
    this.state = {
      cursor: { x: 500, y: 300 },
      lastAction: Date.now(),
      energy: 1.0,
    };
  }

  getDelay(base = 100) {
    const latency = this.entity.operate?.latency ?? 'instant';
    const hesitation = this.entity.instincts?.hesitation ?? 0;
    const entropy = this.entity.dynamics?.entropy ?? 0;

    const multiplier = {
      instant: 0.08,
      robotic: 0.3,
      organic: 1.0,
      human: 1.8,
      sluggish: 3.5,
    }[latency] ?? 0.1;

    const jitter = (this._rng() - 0.5) * 2 * entropy * base;
    const pause = Math.max(0, this._rng() * hesitation * base * 2);

    return Math.max(5, base * multiplier + jitter + pause);
  }

  // Cubic Bezier mouse movement with burst pattern (CloakBrowser-style)
  getMouseCurve(start, end, opts = {}) {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const minSteps = opts.minSteps ?? 25;
    const maxSteps = opts.maxSteps ?? 80;
    const stepsDivisor = opts.stepsDivisor ?? 8;
    const wobbleMax = opts.wobbleMax ?? 1.5;

    const steps = Math.min(maxSteps, Math.max(minSteps, Math.round(distance / stepsDivisor)));

    const st = { x: start.x, y: start.y };
    const en = { x: end.x, y: end.y };
    const [cp1, cp2] = randomControlPoints(st, en, this._rng2);

    const points = [];
    let burstCounter = 0;
    const burstSize = 3 + Math.floor(this._rng() * 3);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const easedT = easeInOut(t);
      const pt = bezier(st, cp1, cp2, en, easedT);

      const wobbleAmp = Math.sin(Math.PI * t) * wobbleMax;
      const wx = pt.x + (this._rng() - 0.5) * 2 * wobbleAmp;
      const wy = pt.y + (this._rng() - 0.5) * 2 * wobbleAmp;

      points.push({ x: Math.round(wx), y: Math.round(wy), burst: false });

      burstCounter++;
      if (burstCounter >= burstSize && i < steps) {
        points.push({ x: Math.round(wx), y: Math.round(wy), burst: true });
        burstCounter = 0;
      }
    }

    // Overshoot
    const precision = this.entity.instincts?.precision ?? 0.5;
    if (this._rng3() < (1 - precision)) {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const osDist = 3 + this._rng() * 3;
      const osX = end.x + Math.cos(angle) * osDist;
      const osY = end.y + Math.sin(angle) * osDist;
      points.push({ x: Math.round(osX), y: Math.round(osY), burst: false, ovsh: true });
      points.push({ x: end.x, y: end.y, burst: false });
    }

    return points;
  }

  getScrollCurve(currentScroll, amount, opts = {}) {
    const steps = Math.min(60, Math.max(10, Math.floor(Math.abs(amount) / 15)));
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      points.push(currentScroll + amount * eased);
    }
    return points;
  }

  getTypingDelay() {
    const base = this.entity.instincts?.hesitation ?? 0.5;
    const wpm = lerp(40, 10, base);
    const msPerChar = 1200 / wpm;
    const jitter = (this._rng2() - 0.5) * 0.3 * msPerChar;
    return Math.max(10, msPerChar + jitter);
  }

  shouldMakeTypo() {
    const precision = this.entity.instincts?.precision ?? 0.5;
    const rate = Math.max(0.001, (1 - precision) * 0.06);
    return this._rng3() < rate;
  }

  getKeyHoldDuration() {
    const latency = this.entity.operate?.latency ?? 'instant';
    const base = {
      instant: 10, robotic: 30, organic: 45, human: 60, sluggish: 100,
    }[latency] ?? 30;
    const jitter = (this._rng() - 0.5) * base * 0.6;
    return Math.max(8, base + jitter);
  }

  getArgs() {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled',
      '--force-color-profile=srgb',
      '--disable-infobars',
      '--start-maximized',
    ];

    // GPU: blocklist bypass for WebGPU/WebGL on Docker/Windows
    if (!this.entity.operate?.headless || process.platform === 'win32') {
      args.push('--ignore-gpu-blocklist');
    }

    // Fingerprint
    args.push(`--fingerprint=${this.entity.fingerprint ?? 10000 + Math.floor(Math.random() * 90000)}`);
    args.push(`--fingerprint-platform=${this.entity.platform ?? 'windows'}`);

    // Extensions
    if (this.entity.extensions?.length) {
      const absPaths = this.entity.extensions; // Assume already resolved
      const joined = absPaths.join(',');
      args.push(`--load-extension=${joined}`);
      args.push(`--disable-extensions-except=${joined}`);
    }

    if (this.entity.proxy) {
      args.push(`--proxy-server=${this.entity.proxy}`);
      if (this.entity.webrtcIp !== false) {
        args.push('--fingerprint-webrtc-ip=auto');
      }
    }

    return args;
  }

  plan(actions) {
    const planned = [];
    for (const action of actions) {
      planned.push(action);
      if (this.entity.instincts?.curiosity > 0.4) {
        planned.push({ type: 'idle', ms: this.getDelay(800) });
      }
    }
    return planned;
  }
}