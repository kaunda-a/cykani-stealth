import { describe, it, assert } from '../harness.js';
import { EntityBrain } from '../../src/brain/entity.js';

describe('EntityBrain', () => {
  it('should produce deterministic mouse curves from same seed', () => {
    const a = new EntityBrain({ fingerprint: 7 });
    const b = new EntityBrain({ fingerprint: 7 });
    const curveA = a.getMouseCurve({ x: 0, y: 0 }, { x: 500, y: 300 });
    const curveB = b.getMouseCurve({ x: 0, y: 0 }, { x: 500, y: 300 });
    assert.equal(curveA.length, curveB.length);
    assert.equal(curveA[0].x, curveB[0].x);
    assert.equal(curveA[Math.floor(curveA.length / 2)].x, curveB[Math.floor(curveB.length / 2)].x);
    assert.equal(curveA[curveA.length - 1].x, curveB[curveB.length - 1].x);
  });

  it('should produce different curves from different seeds', () => {
    const a = new EntityBrain({ fingerprint: 1 });
    const b = new EntityBrain({ fingerprint: 2 });
    const curveA = a.getMouseCurve({ x: 0, y: 0 }, { x: 500, y: 300 });
    const curveB = b.getMouseCurve({ x: 0, y: 0 }, { x: 500, y: 300 });
    const mid = Math.floor(Math.min(curveA.length, curveB.length) / 2);
    const different = curveA[mid].x !== curveB[mid].x || curveA[mid].y !== curveB[mid].y;
    assert.ok(different, 'Different seeds should produce different curves');
  });

  it('should produce typing delays in realistic range', () => {
    const brain = new EntityBrain({ instincts: { hesitation: 0.5 }, fingerprint: 7 });
    for (let i = 0; i < 50; i++) {
      const delay = brain.getTypingDelay();
      assert.ok(delay >= 10 && delay <= 200, `Typing delay ${delay} out of realistic range`);
    }
  });

  it('should include fingerprint launch args', () => {
    const brain = new EntityBrain({ fingerprint: 42, platform: 'linux' });
    const args = brain.getArgs();
    assert.ok(args.some(a => a === '--fingerprint=42'));
    assert.ok(args.some(a => a === '--fingerprint-platform=linux'));
  });

  it('should include required stealth args', () => {
    const brain = new EntityBrain({ operate: { headless: true } });
    const args = brain.getArgs();
    assert.ok(args.some(a => a === '--disable-blink-features=AutomationControlled'));
    assert.ok(args.some(a => a === '--no-sandbox'));
  });

  it('should have deterministic typo decisions', () => {
    const brain = new EntityBrain({ instincts: { precision: 0.5 }, fingerprint: 7 });
    const results = [];
    for (let i = 0; i < 100; i++) results.push(brain.shouldMakeTypo());
    const trueCount = results.filter(Boolean).length;
    assert.ok(trueCount > 0, 'Should produce some typos at precision=0.5');
    assert.ok(trueCount < 30, 'Should not produce too many typos');
  });

  it('should produce deterministic delay sequences', () => {
    const a = new EntityBrain({ fingerprint: 7 });
    const b = new EntityBrain({ fingerprint: 7 });
    for (let i = 0; i < 20; i++) {
      assert.equal(a.getDelay(100), b.getDelay(100));
    }
  });

  it('should scale delays by latency profile', () => {
    const sluggish = new EntityBrain({ operate: { latency: 'sluggish' } });
    const instant = new EntityBrain({ operate: { latency: 'instant' } });
    assert.ok(sluggish.getDelay(100) > instant.getDelay(100));
  });

  it('should generate scroll curves with eased steps', () => {
    const brain = new EntityBrain({ fingerprint: 7 });
    const curve = brain.getScrollCurve(0, 1000);
    assert.ok(curve.length >= 10);
    assert.equal(curve[0], 0);
    assert.equal(curve[curve.length - 1], 1000);
  });

  it('should produce mouse curves with overshoot when precision is low', () => {
    const brain = new EntityBrain({ instincts: { precision: 0.1 }, fingerprint: 7 });
    const curve = brain.getMouseCurve({ x: 100, y: 100 }, { x: 300, y: 300 });
    const hasOvershoot = curve.some(p => p.ovsh);
    assert.ok(hasOvershoot);
  });
});
