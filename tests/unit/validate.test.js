import { describe, it, assert } from '../harness.js';
import { validateEntity, assertValidEntity } from '../../src/utils/validate.js';

describe('validateEntity', () => {
  it('should accept a valid minimal entity', () => {
    const result = validateEntity({ fingerprint: 7 });
    assert.ok(result.valid);
    assert.equal(result.errors.length, 0);
  });

  it('should accept empty entity', () => {
    const result = validateEntity({});
    assert.ok(result.valid);
  });

  it('should reject non-object', () => {
    const result = validateEntity(null);
    assert.ok(!result.valid);
    assert.ok(result.errors.length > 0);
  });

  it('should reject out-of-range fingerprint', () => {
    const result = validateEntity({ fingerprint: 99999 });
    assert.ok(!result.valid);
    assert.ok(result.errors[0].includes('fingerprint'));
  });

  it('should reject non-integer fingerprint', () => {
    const result = validateEntity({ fingerprint: 7.5 });
    assert.ok(!result.valid);
  });

  it('should reject invalid platform', () => {
    const result = validateEntity({ platform: 'ios' });
    assert.ok(!result.valid);
  });

  it('should accept valid platform', () => {
    const result = validateEntity({ platform: 'windows' });
    assert.ok(result.valid);
  });

  it('should reject out-of-range instincts', () => {
    const result = validateEntity({ instincts: { hesitation: 5 } });
    assert.ok(!result.valid);
    assert.ok(result.errors[0].includes('hesitation'));
  });

  it('should accept valid instincts', () => {
    const result = validateEntity({ instincts: { hesitation: 0.5, precision: 0.8, curiosity: 0.2 } });
    assert.ok(result.valid);
  });

  it('should reject invalid latency', () => {
    const result = validateEntity({ operate: { latency: 'turbo' } });
    assert.ok(!result.valid);
  });

  it('should accept valid latency', () => {
    const result = validateEntity({ operate: { latency: 'human' } });
    assert.ok(result.valid);
  });

  it('should warn about non-boolean headless', () => {
    const result = validateEntity({ operate: { headless: 'yes' } });
    assert.ok(result.warnings.length > 0);
  });

  it('should reject invalid viewport', () => {
    const result = validateEntity({ viewport: { width: 100 } });
    assert.ok(!result.valid);
  });

  it('should assertValidEntity throw on invalid', () => {
    assert.throws(() => assertValidEntity({ platform: 'beos' }));
  });

  it('should assertValidEntity pass on valid', () => {
    assert.doesNotThrow(() => assertValidEntity({ fingerprint: 42 }));
  });

  it('should reject non-array extensions', () => {
    const result = validateEntity({ extensions: 'path/to/ext' });
    assert.ok(!result.valid);
  });

  it('should accept array extensions', () => {
    const result = validateEntity({ extensions: ['/ext1', '/ext2'] });
    assert.ok(result.valid);
  });

  it('should reject non-string locale', () => {
    const result = validateEntity({ locale: 42 });
    assert.ok(!result.valid);
  });
});
