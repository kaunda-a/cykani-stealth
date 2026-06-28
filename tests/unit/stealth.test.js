import { describe, it, assert } from '../harness.js';
import { CONSTELLATION } from '../../src/stealth/constellation.js';
import { PHANTOM } from '../../src/stealth/phantom.js';
import { WEBSOCKET_PATCH } from '../../src/stealth/websocket.js';
import { CURSOR_OVERLAY_JS } from '../../src/stealth/cursor.js';
import { Perceptual } from '../../src/agents/perceptual.js';

describe('Constellation stealth script', () => {
  it('should be a valid self-executing function', () => {
    assert.ok(CONSTELLATION.startsWith('(function()'));
    assert.ok(CONSTELLATION.endsWith(')();'));
  });

  it('should patch webdriver via defineProperty', () => {
    assert.ok(CONSTELLATION.includes('defineProperty'));
    assert.ok(CONSTELLATION.includes('webdriver'));
    assert.ok(!CONSTELLATION.includes('delete Object.getPrototypeOf(nav).webdriver'));
  });

  it('should patch WebGL2RenderingContext', () => {
    assert.ok(CONSTELLATION.includes('WebGL2RenderingContext'));
  });

  it('should patch chrome.runtime', () => {
    assert.ok(CONSTELLATION.includes('chrome.runtime'));
  });

  it('should patch WebGPU navigator.gpu', () => {
    assert.ok(CONSTELLATION.includes('navigator.gpu'));
    assert.ok(CONSTELLATION.includes('requestAdapter'));
  });

  it('should patch WebCodecs MediaSource.isTypeSupported', () => {
    assert.ok(CONSTELLATION.includes('MediaSource.isTypeSupported'));
  });

  it('should patch WebTransport constructor', () => {
    assert.ok(CONSTELLATION.includes('window.WebTransport'));
  });

  it('should suppress SharedArrayBuffer', () => {
    assert.ok(CONSTELLATION.includes('SharedArrayBuffer'));
  });

  it('should patch requestIdleCallback with delay', () => {
    assert.ok(CONSTELLATION.includes('requestIdleCallback'));
  });

  it('should patch getClientRects with noise', () => {
    assert.ok(CONSTELLATION.includes('getClientRects'));
  });

  it('should remove cdc_ variables', () => {
    assert.ok(CONSTELLATION.includes('cdc_'));
  });

  it('should not have duplicate permissions.query overrides', () => {
    const matches = CONSTELLATION.match(/permissions\.query\s*=/g);
    assert.equal(matches ? matches.length : 0, 1, 'permissions.query assignment should appear exactly once');
  });
});

describe('Phantom stealth script', () => {
  it('should be a valid self-executing function', () => {
    assert.ok(PHANTOM.startsWith('(function()'));
    assert.ok(PHANTOM.endsWith(')();'));
  });

  it('should patch AudioContext createBuffer', () => {
    assert.ok(PHANTOM.includes('AudioContext'));
    assert.ok(PHANTOM.includes('createBuffer'));
  });

  it('should patch Canvas getImageData', () => {
    assert.ok(PHANTOM.includes('getImageData'));
    assert.ok(PHANTOM.includes('perturb'));
  });

  it('should naturalize Battery API', () => {
    assert.ok(PHANTOM.includes('getBattery'));
  });

  it('should spoof deviceMemory and hardwareConcurrency', () => {
    assert.ok(PHANTOM.includes('deviceMemory'));
    assert.ok(PHANTOM.includes('hardwareConcurrency'));
  });

  it('should use PluginArray prototype for plugins', () => {
    assert.ok(PHANTOM.includes('PluginArray'));
  });

  it('should use MimeTypeArray prototype for mimeTypes', () => {
    assert.ok(PHANTOM.includes('MimeTypeArray'));
  });
});

describe('WebSocketPatch script', () => {
  it('should be a valid self-executing function', () => {
    assert.ok(WEBSOCKET_PATCH.startsWith('(function()'));
    assert.ok(WEBSOCKET_PATCH.endsWith(')();'));
  });

  it('should patch WebSocket constructor', () => {
    assert.ok(WEBSOCKET_PATCH.includes('WebSocket'));
  });
});

describe('CursorOverlay script', () => {
  it('should create a cursor overlay element', () => {
    assert.ok(CURSOR_OVERLAY_JS.includes('__cykani_cursor'));
    assert.ok(CURSOR_OVERLAY_JS.includes('createElement'));
  });

  it('should listen to mousemove events', () => {
    assert.ok(CURSOR_OVERLAY_JS.includes('mousemove'));
  });
});

describe('Perceptual fingerprint generator', () => {
  it('should produce consistent patches from same seed', () => {
    const a = new Perceptual(7);
    const b = new Perceptual(7);
    assert.equal(a.getPatches(), b.getPatches());
  });

  it('should produce different patches from different seeds', () => {
    const a = new Perceptual(1);
    const b = new Perceptual(2);
    assert.notEqual(a.getPatches(), b.getPatches());
  });

  it('should include WebGL vendor overrides', () => {
    const p = new Perceptual(7);
    const patches = p.getPatches();
    assert.ok(patches.includes('getParameter'));
    assert.ok(patches.includes('37445'));
  });
});
