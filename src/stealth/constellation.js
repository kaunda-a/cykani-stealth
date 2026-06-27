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
      delete Object.getPrototypeOf(nav).webdriver;
    }

    // ─── Chrome runtime patch ───
    if (win.chrome && win.chrome.runtime) {
      Object.defineProperty(win.chrome, 'runtime', {
        get() { return undefined; },
        enumerable: true,
        configurable: true
      });
    }

    // ─── Permissions denial consistency ───
    try {
      const originalQuery = nav.permissions.query;
      nav.permissions.query = function(parameters) {
        return originalQuery.call(nav.permissions, parameters).catch(function() {
          return { state: 'denied', onchange: null };
        });
      };
    } catch (_) {}

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
        if (parameter === 37445) return 'Intel Inc.';      // UNMASKED_VENDOR_WEBGL
        if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
        return getParam.call(this, parameter);
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
  }.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, '');

  return `(function(){${code}})();`;
})();

export async function injectConstellation(page) {
  await page.addInitScript(CONSTELLATION);
  // Also evaluate immediately for existing page (iframe patch won't apply retroactively though)
  await page.evaluate(CONSTELLATION).catch(() => {});
}
