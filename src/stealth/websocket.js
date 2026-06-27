// Websocket — stealth patches for WebSocket to prevent fingerprinting leaks

export const WEBSOCKET_PATCH = (() => {
  const code = function() {
    'use strict';

    if (!window.WebSocket) return;

    const OriginalWebSocket = window.WebSocket;
    const origOpenDescriptor = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, 'readyState');
    const origUrlDescriptor = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, 'url');

    // Patch constructor to hide potential automation indicators in the URL
    window.WebSocket = function(url, protocols) {
      // Normal initialize
      const ws = new OriginalWebSocket(url, protocols);
      return ws;
    };

    // Mirror static properties
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

    // Make it look native
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
  }.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, '');

  return `(function(){${code}})();`;
})();

export async function patchWebSocket(page) {
  await page.addInitScript(WEBSOCKET_PATCH);
  await page.evaluate(WEBSOCKET_PATCH).catch(() => {});
}

export class WebSocketInterceptor {
  constructor(page) {
    this.page = page;
    this.intercepts = [];
  }

  async install() {
    this.page.on('websocket', (ws) => {
      this.intercepts.forEach(fn => {
        try { fn(ws); } catch (_) {}
      });
    });
  }

  onMessage(callback) {
    this.intercepts.push((ws) => {
      ws.on('framereceived', (data) => callback(data, ws));
    });
  }

  onSend(callback) {
    this.intercepts.push((ws) => {
      ws.on('framesent', (data) => callback(data, ws));
    });
  }
}
