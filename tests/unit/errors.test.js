import { describe, it, assert } from '../harness.js';
import { StealthError, ValidationError, SessionError, CaptchaError, BrowserError } from '../../src/utils/errors.js';

describe('Custom error types', () => {
  it('StealthError has correct name and code', () => {
    const e = new StealthError('something broke');
    assert.equal(e.name, 'StealthError');
    assert.equal(e.code, 'STEALTH_ERR');
    assert.equal(e.message, 'something broke');
  });

  it('ValidationError extends StealthError', () => {
    const e = new ValidationError('bad config', { field: 'fingerprint' });
    assert.ok(e instanceof StealthError);
    assert.equal(e.name, 'ValidationError');
    assert.equal(e.code, 'VALIDATION_ERR');
    assert.deepEqual(e.details, { field: 'fingerprint' });
  });

  it('SessionError extends StealthError', () => {
    const e = new SessionError('session not found', { id: 'abc' });
    assert.ok(e instanceof StealthError);
    assert.equal(e.code, 'SESSION_ERR');
  });

  it('CaptchaError extends StealthError', () => {
    const e = new CaptchaError('solver failed', { service: 'capsolver' });
    assert.ok(e instanceof StealthError);
    assert.equal(e.code, 'CAPTCHA_ERR');
  });

  it('BrowserError extends StealthError', () => {
    const e = new BrowserError('crash', { exitCode: 1 });
    assert.ok(e instanceof StealthError);
    assert.equal(e.code, 'BROWSER_ERR');
  });
});
