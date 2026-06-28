export class StealthError extends Error {
  constructor(message, code = 'STEALTH_ERR', details = {}) {
    super(message);
    this.name = 'StealthError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends StealthError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERR', details);
    this.name = 'ValidationError';
  }
}

export class SessionError extends StealthError {
  constructor(message, details = {}) {
    super(message, 'SESSION_ERR', details);
    this.name = 'SessionError';
  }
}

export class CaptchaError extends StealthError {
  constructor(message, details = {}) {
    super(message, 'CAPTCHA_ERR', details);
    this.name = 'CaptchaError';
  }
}

export class BrowserError extends StealthError {
  constructor(message, details = {}) {
    super(message, 'BROWSER_ERR', details);
    this.name = 'BrowserError';
  }
}
