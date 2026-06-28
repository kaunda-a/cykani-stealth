import { describe, it, assert } from '../harness.js';
import { CookieJar } from '../../src/utils/cookies.js';

describe('CookieJar', () => {
  it('should store and retrieve cookies', () => {
    const jar = new CookieJar();
    jar.set('https://example.com', { name: 'test', value: '123' });
    const cookies = jar.get('https://example.com');
    assert.equal(cookies.length, 1);
    assert.equal(cookies[0].name, 'test');
    assert.equal(cookies[0].value, '123');
  });

  it('should match cookies by domain (parent domain matches subdomain)', () => {
    const jar = new CookieJar();
    jar.set('https://example.com', { name: 'session', value: 'abc' });
    const cookies = jar.get('https://sub.example.com');
    assert.equal(cookies.length, 1);
  });

  it('should not match unrelated domains', () => {
    const jar = new CookieJar();
    jar.set('https://example.com', { name: 'test', value: 'x' });
    const cookies = jar.get('https://other.com');
    assert.equal(cookies.length, 0);
  });

  it('should generate cookie header string', () => {
    const jar = new CookieJar();
    jar.set('https://example.com', { name: 'a', value: '1' });
    jar.set('https://example.com', { name: 'b', value: '2' });
    const header = jar.toHeaderString('https://example.com');
    assert.ok(header.includes('a=1'));
    assert.ok(header.includes('b=2'));
  });

  it('should clear all cookies', () => {
    const jar = new CookieJar();
    jar.set('https://a.com', { name: 'x', value: '1' });
    jar.set('https://b.com', { name: 'y', value: '2' });
    jar.clear();
    assert.equal(jar.get('https://a.com').length, 0);
    assert.equal(jar.get('https://b.com').length, 0);
  });

  it('should clear domain-specific cookies', () => {
    const jar = new CookieJar();
    jar.set('https://a.com', { name: 'x', value: '1' });
    jar.set('https://b.com', { name: 'y', value: '2' });
    jar.clear('a.com');
    assert.equal(jar.get('https://a.com').length, 0);
    assert.equal(jar.get('https://b.com').length, 1);
  });

  it('should expire old cookies', () => {
    const jar = new CookieJar();
    jar.set('https://example.com', { name: 'old', value: 'gone', expires: Date.now() - 1000 });
    assert.equal(jar.get('https://example.com').length, 0);
  });

  it('should not expire valid cookies', () => {
    const jar = new CookieJar();
    jar.set('https://example.com', { name: 'fresh', value: 'ok', expires: Date.now() + 86400000 });
    assert.equal(jar.get('https://example.com').length, 1);
  });
});
