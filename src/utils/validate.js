import { ValidationError } from './errors.js';

const VALID_LATENCIES = new Set(['instant', 'robotic', 'organic', 'human', 'sluggish']);
const VALID_PLATFORMS = new Set(['windows', 'macos', 'linux']);

export function validateEntity(entity) {
  if (!entity || typeof entity !== 'object') {
    return { valid: false, errors: ['Entity must be an object'], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  if (entity.fingerprint !== undefined) {
    if (!Number.isInteger(entity.fingerprint) || entity.fingerprint < 1 || entity.fingerprint > 10000) {
      errors.push('fingerprint must be an integer between 1 and 10000');
    }
  }

  if (entity.platform !== undefined && !VALID_PLATFORMS.has(entity.platform)) {
    errors.push(`platform must be one of: ${[...VALID_PLATFORMS].join(', ')}`);
  }

  if (entity.locale !== undefined && typeof entity.locale !== 'string') {
    errors.push('locale must be a string (e.g. "en-US")');
  }

  if (entity.timezone !== undefined && typeof entity.timezone !== 'string') {
    errors.push('timezone must be a string (e.g. "America/New_York")');
  }

  if (entity.proxy !== undefined && typeof entity.proxy !== 'string') {
    errors.push('proxy must be a string (e.g. "http://user:pass@host:port")');
  }

  if (entity.instincts) {
    if (typeof entity.instincts !== 'object') {
      errors.push('instincts must be an object');
    } else {
      for (const key of ['hesitation', 'precision', 'curiosity']) {
        const val = entity.instincts[key];
        if (val !== undefined && (typeof val !== 'number' || val < 0 || val > 1)) {
          errors.push(`instincts.${key} must be a number between 0 and 1`);
        }
      }
    }
  }

  if (entity.dynamics) {
    if (typeof entity.dynamics !== 'object') {
      errors.push('dynamics must be an object');
    } else {
      for (const key of ['entropy', 'inertia']) {
        const val = entity.dynamics[key];
        if (val !== undefined && (typeof val !== 'number' || val < 0 || val > 1)) {
          errors.push(`dynamics.${key} must be a number between 0 and 1`);
        }
      }
    }
  }

  if (entity.operate) {
    if (typeof entity.operate !== 'object') {
      errors.push('operate must be an object');
    } else {
      if (entity.operate.latency !== undefined && !VALID_LATENCIES.has(entity.operate.latency)) {
        errors.push(`operate.latency must be one of: ${[...VALID_LATENCIES].join(', ')}`);
      }
      if (entity.operate.timeout !== undefined && (typeof entity.operate.timeout !== 'number' || entity.operate.timeout < 0)) {
        errors.push('operate.timeout must be a positive number');
      }
      if (entity.operate.headless !== undefined && typeof entity.operate.headless !== 'boolean') {
        warnings.push('operate.headless should be a boolean (non-boolean values coerced)');
      }
      if (entity.operate.headless === false && entity.proxy && entity.proxy.includes('@')) {
        warnings.push('authenticated proxy with headful mode may leak credentials in Chrome UI');
      }
    }
  }

  if (entity.extensions !== undefined && !Array.isArray(entity.extensions)) {
    errors.push('extensions must be an array of paths');
  }

  if (entity.viewport !== undefined && typeof entity.viewport === 'object') {
    if (entity.viewport.width !== undefined && (typeof entity.viewport.width !== 'number' || entity.viewport.width < 320)) {
      errors.push('viewport.width must be a number >= 320');
    }
    if (entity.viewport.height !== undefined && (typeof entity.viewport.height !== 'number' || entity.viewport.height < 240)) {
      errors.push('viewport.height must be a number >= 240');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertValidEntity(entity) {
  const result = validateEntity(entity);
  if (!result.valid) {
    throw new ValidationError(`Invalid Entity config:\n  - ${result.errors.join('\n  - ')}`, { errors: result.errors, warnings: result.warnings });
  }
  return result;
}
