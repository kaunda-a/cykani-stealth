// Deep stealth injection via Chrome DevTools Protocol
// Patches every known automation leak at runtime before any page JS executes.
// This runs in the *page* context, not the extension context.

export const CONSTELLATION = (() => {
  const code = function() {
    'use strict';

    const win = window;
    const nav = navigator;

    // ─── Navigator patches ───
    if (nav.webdriver !== undefined) {
      Object.defineProperty(nav, 'webdriver', { get() { return undefined; }, configurable: true });
    }

    // ─── Chrome runtime patch ───
    if (win.chrome && win.chrome.runtime) {
      Object.defineProperty(win.chrome, 'runtime', {
        get() { return undefined; },
        enumerable: true,
        configurable: true
      });
    }

    // ─── Plugin prototype length consistency ───
    try {
      Object.setPrototypeOf(nav.plugins, PluginArray.prototype);
      Object.setPrototypeOf(nav.mimeTypes, MimeTypeArray.prototype);
    } catch (_) {}

    // ─── iframe webdriver clean ───
    try {
      const ifrProto = HTMLIFrameElement.prototype;
      const origContentWindow = Object.getOwnPropertyDescriptor(ifrProto, 'contentWindow');
      if (origContentWindow && origContentWindow.get) {
        const getter = origContentWindow.get;
        Object.defineProperty(ifrProto, 'contentWindow', {
          get() {
            const cw = getter.call(this);
            if (cw && cw.navigator) {
              try { delete cw.navigator.webdriver; } catch (_) {}
            }
            return cw;
          }
        });
      }
    } catch (_) {}

    // ─── Notification permission patch ───
    try {
      const origNotification = win.Notification;
      if (origNotification) {
        Object.defineProperty(win.Notification, 'permission', {
          get() { return 'default'; }
        });
      }
    } catch (_) {}

    // ─── WebGL vendor consistency (if queried) ───
    try {
      const getParam = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParam.call(this, parameter);
      };
    } catch (_) {}
    try {
      const getParam2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParam2.call(this, parameter);
      };
    } catch (_) {}

    // ─── Override Permissions API to avoid automation flags ───
    try {
      const permissions = nav.permissions;
      if (permissions) {
        const originalQuery = permissions.query.bind(permissions);
        permissions.query = function(parameters) {
          return originalQuery(parameters).catch(function() {
            return { state: 'denied', onchange: null };
          });
        };
      }
    } catch (_) {}

    // ─── Consistent `permission` property on PermissionStatus ───
    try {
      const desc = Object.getOwnPropertyDescriptor(PermissionStatus.prototype, 'state');
      if (desc) {
        Object.defineProperty(PermissionStatus.prototype, 'state', {
          get() {
            const val = desc.get.call(this);
            if (val === 'prompt') return 'default';
            return val;
          }
        });
      }
    } catch (_) {}

    // ─── Remove `cdc_` variables (ChromeDriver leftovers) ───
    try {
      for (const key in window) {
        if (/^\$[a-zA-Z0-9]{3}$/.test(key) || key.startsWith('cdc_')) {
          try { delete window[key]; } catch (_) {}
        }
      }
    } catch (_) {}

    // ─── WebGPU fingerprint normalization ───
    try {
      if (navigator.gpu) {
        const origRequestAdapter = navigator.gpu.requestAdapter.bind(navigator.gpu);
        navigator.gpu.requestAdapter = async function(options) {
          const adapter = await origRequestAdapter(options);
          if (!adapter) return null;
          const origRequestDevice = adapter.requestDevice.bind(adapter);
          adapter.requestDevice = async function(desc) {
            const device = await origRequestDevice(desc);
            const origPopErrorScope = device.popErrorScope.bind(device);
            device.popErrorScope = async function() {
              return null;
            };
            return device;
          };
          return adapter;
        };
      }
    } catch (_) {}

    // ─── WebCodecs vendor spoofing ───
    try {
      if (window.MediaSource) {
        const origIsTypeSupported = MediaSource.isTypeSupported.bind(MediaSource);
        MediaSource.isTypeSupported = function(type) {
          if (type && (type.includes('vp9') || type.includes('av01'))) return false;
          return origIsTypeSupported(type);
        };
      }
    } catch (_) {}

    // ─── WebTransport leak mitigation ───
    try {
      if (window.WebTransport) {
        const OrigWebTransport = window.WebTransport;
        window.WebTransport = function(...args) {
          const wt = new OrigWebTransport(...args);
          return wt;
        };
        window.WebTransport.prototype = OrigWebTransport.prototype;
      }
    } catch (_) {}

    // ─── SharedArrayBuffer normalization ───
    try {
      if (window.SharedArrayBuffer) {
        Object.defineProperty(window, 'SharedArrayBuffer', {
          get() { return undefined; },
          configurable: true,
        });
      }
    } catch (_) {}

    // ─── requestIdleCallback removal (headless indicator) ───
    try {
      if (window.requestIdleCallback) {
        const origRIC = window.requestIdleCallback.bind(window);
        window.requestIdleCallback = function(callback, options) {
          const delay = Math.max(1, Math.random() * 30);
          return origRIC(callback, { ...options, timeout: delay });
        };
      }
    } catch (_) {}

    // ─── getClientRects normalization ───
    try {
      const origGetClientRects = Element.prototype.getClientRects;
      if (origGetClientRects) {
        Element.prototype.getClientRects = function() {
          const rects = origGetClientRects.call(this);
          if (rects && rects.length > 0) {
            for (let i = 0; i < Math.min(rects.length, 3); i++) {
              const r = rects[i];
              if (r.width > 0 && r.height > 0) {
                r.x += 0.01;
                r.y += 0.01;
              }
            }
          }
          return rects;
        };
      }
    } catch (_) {}

    // ─── Performance API stealth ───
    try {
      const origNow = Performance.prototype.now;
      if (origNow) {
        Performance.prototype.now = function() {
          var t = origNow.call(this);
          return Math.round(t / 5) * 5;
        };
      }
    } catch (_) {}
    try {
      if (performance.timeOrigin !== undefined) {
        Object.defineProperty(performance, 'timeOrigin', {
          get() { return performance.timing ? performance.timing.navigationStart : Date.now() - performance.now(); },
          configurable: true,
        });
      }
    } catch (_) {}
    try {
      if (!performance.memory) {
        Object.defineProperty(performance, 'memory', {
          get() {
            return {
              jsHeapSizeLimit: 2172649472,
              totalJSHeapSize: 10000000 + Math.floor(Math.random() * 50000000),
              usedJSHeapSize: 8000000 + Math.floor(Math.random() * 30000000),
            };
          },
          configurable: true,
        });
      }
    } catch (_) {}
  }.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, '');

  return `(function(){${code}})();`;
})();

export async function injectConstellation(page) {
  await page.addInitScript(CONSTELLATION);
  // Also evaluate immediately for existing page (iframe patch won't apply retroactively though)
  await page.evaluate(CONSTELLATION).catch(() => {});
}
