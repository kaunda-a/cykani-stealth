// Hooks — plugin/hooks architecture for extensibility

export class Hooks {
  constructor() {
    this.registry = new Map();
  }

  on(event, fn) {
    if (!this.registry.has(event)) {
      this.registry.set(event, []);
    }
    this.registry.get(event).push(fn);
  }

  off(event, fn) {
    const fns = this.registry.get(event) || [];
    const idx = fns.indexOf(fn);
    if (idx > -1) fns.splice(idx, 1);
  }

  async emit(event, payload) {
    const fns = this.registry.get(event) || [];
    for (const fn of fns) {
      try {
        const result = fn(payload);
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (_) {
        // hooks are best-effort
      }
    }
    return payload;
  }
}
