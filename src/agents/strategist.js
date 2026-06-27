// Strategist — per-site behavioral profiles and adaptive challenge response

export class Strategist {
  constructor(entity = {}) {
    this.profiles = new Map();
    this.defaultProfile = this._makeDefaultProfile();
    this.entity = entity;
  }

  _makeDefaultProfile() {
    return {
      scrollSpeed: 'medium',
      readingDepth: 'shallow',
      interactionPattern: 'conservative',
      captchaStrategy: 'abort',
      retryPolicy: { maxRetries: 3, backoff: 'exponential' },
    };
  }

  register(hostname, profile) {
    this.profiles.set(hostname, { ...this.defaultProfile, ...profile });
  }

  resolve(url) {
    const hostname = new URL(url).hostname;
    // Try exact match, then progressive subdomain stripping
    let profile = this.profiles.get(hostname);
    if (profile) return profile;

    const parts = hostname.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      const stripped = parts.slice(i).join('.');
      profile = this.profiles.get(stripped);
      if (profile) return profile;
    }

    return this.defaultProfile;
  }

  adaptFromObserver(observerResult) {
    if (observerResult.detected) {
      return {
        ...this.defaultProfile,
        interactionPattern: 'cautious',
        captchaStrategy: observerResult.type,
        readingDepth: 'deep',
      };
    }
    return this.defaultProfile;
  }

  // Factory: high-trust profile
  static highTrust() {
    return new Strategist({
      scrollSpeed: 'slow',
      readingDepth: 'deep',
      interactionPattern: 'natural',
      captchaStrategy: 'solve',
      retryPolicy: { maxRetries: 5, backoff: 'linear' },
    });
  }

  // Factory: aggressive profile
  static aggressive() {
    return new Strategist({
      scrollSpeed: 'fast',
      readingDepth: 'none',
      interactionPattern: 'direct',
      captchaStrategy: 'abort',
      retryPolicy: { maxRetries: 1, backoff: 'none' },
    });
  }
}
