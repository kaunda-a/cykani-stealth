// Perceptual — per-session fingerprint randomization that stays consistent within session

export class Perceptual {
  constructor(seed = 7) {
    this.seed = seed;
    this.state = this._deriveState(seed);
  }

  _deriveState(seed) {
    // Deterministic PRNG based on seed
    let x = Math.sin(seed) * 10000;
    const rand = () => {
      x = (x * 1103515245 + 12345) % 2147483647;
      return x / 2147483647;
    };

    return {
      webglVendor: this._randomChoice(['Intel Inc.', 'NVIDIA Corporation', 'AMD'], rand),
      webglRenderer: this._randomChoice(
        ['Intel Iris OpenGL Engine', 'GeForce GTX 1050', 'Radeon RX 580'],
        rand
      ),
      canvasNoise: rand() * 0.01,
      audioNoise: rand() * 0.001,
      maxTouchPoints: this._randomChoice([0, 5, 10], rand),
    };
  }

  _randomChoice(choices, rand) {
    return choices[Math.floor(rand() * choices.length)];
  }

  getPatches() {
    return `
(function(){
  // WebGL
  try {
    const origGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return "${this.state.webglVendor}";
      if (param === 37446) return "${this.state.webglRenderer}";
      return origGetParameter.apply(this, arguments);
    };
  } catch(_) {}

  // Canvas
  try {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
      const ctx = this.getContext('2d');
      if (ctx) {
        ctx.rect(Math.random() * 1, 0, 1, 1);
        ctx.fill();
      }
      return origToDataURL.apply(this, arguments);
    };
  } catch(_) {}

  // Max touch points
  try {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get() { return ${this.state.maxTouchPoints}; },
      enumerable: true,
      configurable: true,
    });
  } catch(_) {}
})();
    `.trim();
  }
}
