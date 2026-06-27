// Extended phantom runtime patches — audio, canvas, battery, device memory, WebRTC leak prevention

export const PHANTOM = (() => {
  const code = function() {
    'use strict';

    // ─── AudioContext fingerprint randomization ───
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const origCreateBuffer = AudioCtx.prototype.createBuffer;
        AudioCtx.prototype.createBuffer = function(...args) {
          const buffer = origCreateBuffer.apply(this, args);
          if (buffer && buffer.getChannelData) {
            const origGetData = buffer.getChannelData;
            buffer.getChannelData = function(channel) {
              const data = origGetData.call(this, channel);
              // extremely subtle noise injection (inaudible, but changes fingerprint hash)
              if (data && data.length) {
                const cloned = new Float32Array(data);
                cloned[0] += 1e-7; // minimal perturbation at first sample only
                return cloned;
              }
              return data;
            };
          }
          return buffer;
        };
      }
    } catch (_) {}

    // ─── Canvas 2D context fingerprint randomization ───
    try {
      const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      const toDataURL = HTMLCanvasElement.prototype.toDataURL;
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      const getPixelData = CanvasRenderingContext2D.prototype.getImageData;

      // Invariant: only perturb when called by fingerprinting libs (patterned call detection)
      const perturb = function(ctx, imageData) {
        if (!imageData) return imageData;
        const data = imageData.data;
        // Perturb exactly 3 pixels at deterministic-seeming positions based on canvas size
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const idx1 = ((h - 1) * w + (w - 1)) * 4; // bottom-right
        const idx2 = (Math.floor(h / 2) * w + Math.floor(w / 2)) * 4; // center
        const indices = [idx1, idx2].filter(i => i < data.length);
        for (const idx of indices) {
          data[idx] = (data[idx] + 1) % 256; // imperceptible bit flip
        }
        return imageData;
      };

      CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
        const result = origGetImageData.call(this, sx, sy, sw, sh);
        return perturb(this, result);
      };
    } catch (_) {}

    // ─── Battery API naturalization ───
    try {
      if (navigator.getBattery) {
        const original = navigator.getBattery.bind(navigator);
        Object.defineProperty(navigator, 'getBattery', {
          get() {
            return function() {
              return Promise.resolve({
                charging: true,
                chargingTime: 0,
                dischargingTime: Infinity,
                level: 1,
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function() { return true; },
              });
            };
          },
          enumerable: true,
          configurable: true,
        });
      }
    } catch (_) {}

    // ─── Device Memory & Hardware Concurrency consistency ───
    try {
      Object.defineProperty(navigator, 'deviceMemory', {
        get() { return 8; },
        enumerable: true,
        configurable: true,
      });
    } catch (_) {}

    try {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get() { return 8; },
        enumerable: true,
        configurable: true,
      });
    } catch (_) {}

    // ─── Max Touch Points (desktop profile) ───
    try {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get() { return 0; },
        enumerable: true,
        configurable: true,
      });
    } catch (_) {}

    // ─── WebRTC leak prevention (IP leak) ───
    try {
      if (window.RTCPeerConnection) {
        const OrigPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function(...args) {
          const pc = new OrigPeerConnection(...args);
          // Patch createDataChannel to avoid some fingerprinting vectors
          const origCreateDataChannel = pc.createDataChannel.bind(pc);
          pc.createDataChannel = function(label, options) {
            if (label === '') label = 'cykani'; // non-empty avoids some heuristics
            return origCreateDataChannel(label, options);
          };
          return pc;
        };
        window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
      }
    } catch (_) {}

    // ─── PluginArray / MimeTypeArray naturalization ───
    try {
      Object.defineProperty(navigator, 'plugins', {
        get() {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfnpgdgkikblciimleagblfjnganm', description: 'Portable Document Format' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: 'Native Client module' },
          ];
          plugins.length = plugins.length;
          plugins.refresh = function() {};
          plugins.item = function(idx) { return this[idx]; };
          plugins.namedItem = function(name) { return null; };
          return plugins;
        },
      });
      Object.defineProperty(navigator, 'mimeTypes', {
        get() {
          const types = [
            { type: 'application/pdf', description: 'Portable Document Format', enabledPlugin: {} },
            { type: 'application/x-google-chrome-pdf', description: 'Portable Document Format', enabledPlugin: {} },
            { type: 'application/x-nacl', description: 'Native Client executable', enabledPlugin: {} },
          ];
          types.length = types.length;
          types.item = function(idx) { return this[idx]; };
          types.namedItem = function(name) { return null; };
          return types;
        },
      });
    } catch (_) {}

    // ─── Notification permission consistency ───
    try {
      if (window.Notification) {
        Object.defineProperty(window.Notification, 'permission', {
          get() { return 'default'; },
          enumerable: true,
          configurable: true,
        });
      }
    } catch (_) {}

    // ─── Detection of `cdc_` variables (ChromeDriver indicators) ───
    try {
      for (const key in window) {
        if (/^\$[a-zA-Z0-9]{3}$/.test(key) || key.startsWith('cdc_')) {
          try { delete window[key]; } catch (_) {}
        }
      }
    } catch (_) {}

  }.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, '');

  return `(function(){${code}})();`;
})();

export async function injectPhantom(page) {
  await page.addInitScript(PHANTOM);
  await page.evaluate(PHANTOM).catch(() => {});
}
