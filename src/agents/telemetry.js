// Telemetry — session recording, HAR-like exports, health dashboards

export class Telemetry {
  constructor(opts = {}) {
    this.events = [];
    this.startTime = Date.now();
    this.maxEvents = opts.maxEvents ?? 10000;
    this.enableHar = opts.enableHar ?? false;
    this.harEntries = [];
  }

  record(type, payload) {
    const event = {
      ts: Date.now(),
      type,
      payload,
    };
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    return event;
  }

  recordRequest(request) {
    if (!this.enableHar) return;
    this.harEntries.push({
      startedDateTime: new Date().toISOString(),
      time: 0,
      request: {
        method: request.method(),
        url: request.url(),
        headers: Object.entries(request.headers()).map(([name, value]) => ({ name, value })),
      },
      response: {},
    });
  }

  recordResponse(response) {
    if (!this.enableHar) return;
    // Update last entry
    const entry = this.harEntries[this.harEntries.length - 1];
    if (entry) {
      entry.response = {
        status: response.status(),
        statusText: response.statusText(),
        headers: Object.entries(response.headers()).map(([name, value]) => ({ name, value })),
      };
    }
  }

  exportHar() {
    return {
      log: {
        version: '1.2',
        creator: { name: 'cykani-stealth', version: '1.0.0' },
        entries: this.harEntries,
      },
    };
  }

  exportMetrics() {
    const now = Date.now();
    const duration = now - this.startTime;
    const types = {};
    for (const e of this.events) {
      types[e.type] = (types[e.type] || 0) + 1;
    }
    return {
      duration,
      totalEvents: this.events.length,
      eventTypes: types,
      avgEventRate: this.events.length / (duration / 1000),
    };
  }

  installOnPage(page) {
    page.on('request', (req) => this.recordRequest(req));
    page.on('response', (res) => this.recordResponse(res));
  }
}
