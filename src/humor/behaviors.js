function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function cognitiveHesitation(brain, page) {
  const density = await page
    .evaluate(() => Math.min(1, document.querySelectorAll('input, textarea, select, button, a').length / 50))
    .catch(() => 0);
  const pause = brain.getDelay(150 + density * 400);
  await sleep(pause);
}

export async function idleMicroMovement(page, brain, mouseMove) {
  const jitterX = (brain._rng() - 0.5) * 12;
  const jitterY = (brain._rng() - 0.5) * 12;
  const target = { x: brain.state.cursor.x + jitterX, y: brain.state.cursor.y + jitterY };
  await strikeMove(page, brain, mouseMove, target, { minSteps: 3, maxSteps: 8, stepsDivisor: 20, wobbleMax: 0.5 });
}

export async function coffeeBreak(page, brain, mouseMove) {
  if (brain._rng() > 0.08) return;
  const duration = 2000 + brain._rng() * 5000;
  const deadline = Date.now() + duration;
  while (Date.now() < deadline) {
    const driftX = (Math.random() - 0.5) * 6;
    const driftY = (Math.random() - 0.5) * 6;
    await mouseMove(brain.state.cursor.x + driftX, brain.state.cursor.y + driftY);
    await sleep(500 + Math.random() * 1000);
  }
}

export async function strikeMove(page, brain, mouseMove, target, curveOpts) {
  const current = { x: brain.state.cursor.x, y: brain.state.cursor.y };
  const distance = Math.hypot(target.x - current.x, target.y - current.y);

  if (distance > 200 && brain._rng() < 0.15) {
    const mid = { x: (current.x + target.x) / 2, y: (current.y + target.y) / 2 };
    const drift = {
      x: mid.x + (brain._rng() - 0.5) * distance * 0.25,
      y: mid.y + (brain._rng() - 0.5) * distance * 0.25,
    };
    const driftPoints = brain.getMouseCurve(current, drift, { minSteps: 8, maxSteps: 20, stepsDivisor: 15, ...curveOpts });
    for (const p of driftPoints) {
      await mouseMove(p.x, p.y);
      await sleep(p.burst ? 5 + Math.random() * 5 : brain.getDelay(4));
    }
    brain.state.cursor = drift;
    await sleep(brain.getDelay(200));

    const correctPoints = brain.getMouseCurve(drift, target, curveOpts);
    for (const p of correctPoints) {
      await mouseMove(p.x, p.y);
      await sleep(p.burst ? 5 + Math.random() * 5 : brain.getDelay(4));
    }
    brain.state.cursor = target;
    return;
  }

  const points = brain.getMouseCurve(current, target, curveOpts);
  for (const p of points) {
    await mouseMove(p.x, p.y);
    await sleep(p.burst ? 5 + Math.random() * 5 : brain.getDelay(4));
  }
  brain.state.cursor = target;
}
