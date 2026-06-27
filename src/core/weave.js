// Weave — network-level interception, header normalization, WebSocket fingerprint mitigation

export class Weave {
  constructor(page) {
    this.page = page;
    this.interceptors = [];
  }

  async install(opts = {}) {
    const normalizeHeaders = opts.normalizeHeaders ?? true;
    const blockResourceTypes = opts.blockResourceTypes ?? ['media', 'other'];

    await this.page.route('**/*', async (route) => {
      const request = route.request();

      // Resource type blocking (reduce fingerprint surface)
      if (blockResourceTypes.includes(request.resourceType())) {
        return route.abort('blockedbyclient');
      }

      const headers = { ...request.headers() };

      if (normalizeHeaders) {
        // Normalise Accept-Language to match locale
        delete headers['x-playwright-browser'];
        delete headers['x-playwright-version'];
        delete headers['x-automation-extension'];
        delete headers['x-headless-chrome'];

        // Consistent sec-* headers
        if (!headers['sec-ch-ua']) {
          headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
        }
        if (!headers['sec-ch-ua-mobile']) {
          headers['sec-ch-ua-mobile'] = '?0';
        }
        if (!headers['sec-ch-ua-platform']) {
          headers['sec-ch-ua-platform'] = '"Windows"';
        }

        // Remove automation indicators
        if (headers['user-agent']) {
          headers['user-agent'] = headers['user-agent'].replace(/HeadlessChrome/g, 'Chrome');
        }

        // DNT consistency
        headers['DNT'] = '1';
        headers['Sec-Fetch-Dest'] = headers['Sec-Fetch-Dest'] ?? 'document';
        headers['Sec-Fetch-Mode'] = headers['Sec-Fetch-Mode'] ?? 'navigate';
        headers['Sec-Fetch-Site'] = headers['Sec-Fetch-Site'] ?? 'none';
        headers['Sec-Fetch-User'] = headers['Sec-Fetch-User'] ?? '?1';
        headers['Upgrade-Insecure-Requests'] = '1';
      }

      // Run custom interceptors
      for (const interceptor of this.interceptors) {
        await interceptor(request, headers);
      }

      return route.continue({ headers });
    });

    // WebSocket interception to patch potential fingerprint vectors
    if (opts.patchWebSocket !== false) {
      this.page.on('websocket', (ws) => {
        // Playwright exposes limited websocket control, but we can monitor
        ws.on('framesent', (data) => {
          // Could mutate frames here if needed
        });
      });
    }
  }

  addInterceptor(fn) {
    this.interceptors.push(fn);
  }
}
