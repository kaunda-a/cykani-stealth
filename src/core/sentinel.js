// Sentinel — circuit breaker, exponential backoff, health metrics

export class Sentinel {
  constructor(opts = {}) {
    this.maxRetries = opts.maxRetries ?? 3;
    this.baseDelay = opts.baseDelay ?? 1000;
    this.maxDelay = opts.maxDelay ?? 30000;
    this.circuitBreakerThreshold = opts.circuitBreakerThreshold ?? 5;
    this.circuitBreakerResetMs = opts.circuitBreakerResetMs ?? 60000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.metrics = [];
  }

  get isOpen() {
    if (this.state !== 'OPEN') return false;
    if (Date.now() - this.lastFailureTime > this.circuitBreakerResetMs) {
      this.state = 'HALF_OPEN';
      return false;
    }
    return true;
  }

  async execute(fn, label = 'operation') {
    if (this.isOpen) {
      throw new Error(`Circuit breaker OPEN for ${label}`);
    }

    let lastError;
    const start = Date.now();

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await fn();
        this._onSuccess(label, Date.now() - start);
        return result;
      } catch (error) {
        lastError = error;
        this._onFailure(label);
        if (attempt < this.maxRetries - 1) {
          await this._delay(attempt);
        }
      }
    }

    this._recordMetric(label, 'failure', Date.now() - start, lastError.message);
    throw lastError;
  }

  async _delay(attempt) {
    const exp = Math.min(attempt, 5);
    const jitter = Math.random() * 0.5 + 0.5;
    const ms = Math.min(this.maxDelay, this.baseDelay * Math.pow(2, exp) * jitter);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _onSuccess(label, duration) {
    this.failures = 0;
    this.state = 'CLOSED';
    this._recordMetric(label, 'success', duration);
  }

  _onFailure(label) {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.circuitBreakerThreshold) {
      this.state = 'OPEN';
    }
  }

  _recordMetric(label, type, duration, error) {
    this.metrics.push({
      timestamp: Date.now(),
      label,
      type,
      duration,
      error,
    });
    // Keep last 1000
    if (this.metrics.length > 1000) this.metrics = this.metrics.slice(-1000);
  }

  getHealth() {
    const recent = this.metrics.filter((m) => Date.now() - m.timestamp < 60000);
    const successes = recent.filter((m) => m.type === 'success').length;
    const failures = recent.filter((m) => m.type === 'failure').length;
    const total = successes + failures;
    return {
      state: this.state,
      successRate: total ? successes / total : 1,
      recentOperations: total,
      avgDuration: total
        ? recent.reduce((a, m) => a + (m.duration || 0), 0) / total
        : 0,
    };
  }
}
