// Cykani-stealth main entry — unified export of all capabilities

import { Maestro } from './core/maestro.js';
import { CookieJar } from './utils/cookies.js';
import { Poolize } from './utils/poolize.js';
import { Hooks } from './utils/hooks.js';
import { Strategist } from './agents/strategist.js';

export { Maestro };
export { EntityBrain } from './brain/entity.js';
export { Choreographer } from './core/choreographer.js';
export { Sentinel } from './core/sentinel.js';
export { Poolize } from './utils/poolize.js';
export { CookieJar } from './utils/cookies.js';
export { Hooks } from './utils/hooks.js';
export { Telemetry } from './agents/telemetry.js';
export { Strategist } from './agents/strategist.js';
export { Observer } from './agents/observer.js';
export { Diagnostic } from './agents/diagnostic.js';
export { Visual } from './agents/visual.js';
export { Perceptual } from './agents/perceptual.js';
export { Perceptor } from './agents/perceptor.js';
export { AutoPilot } from './agents/autoPilot.js';
export { Autonomous } from './agents/autonomous.js';
export { Recorder } from './core/recorder.js';

export { WebSocketInterceptor, patchWebSocket } from './stealth/websocket.js';
export { ensureBinary, binaryInfo, clearCache } from './download.js';
export { resolveProxyConfig, ProxyManager } from './utils/proxy.js';
export { CaptchaSolver } from './utils/captcha.js';
export { Webhook, createSlackWebhook, createDiscordWebhook, createTelegramWebhook } from './utils/webhook.js';

export { StealthEval } from './stealth/eval.js';
export { injectCursorOverlay, patchContextForCursor } from './stealth/cursor.js';
export { walkOut } from './humor/strike.js';

export { IGNORE_DEFAULT_ARGS, DEFAULT_VIEWPORT } from './core/maestro.js';

/** Launch a browser with fluent session API */
export async function launch(entity = {}) {
  const maestro = new Maestro();
  return maestro.launch(entity);
}

/** Create orchestrator for multi-session control */
export function createMaestro(opts = {}) {
  return new Maestro(opts);
}

/** Launch with context (auto-closes browser on context close) */
export async function launchContext(entity = {}) {
  const maestro = new Maestro();
  return maestro.launchContext(entity);
}

/** Launch with persistent user data (avoids incognito detection) */
export async function launchPersistentContext(entity = {}) {
  const maestro = new Maestro();
  return maestro.launchPersistentContext({ ...entity, userDataDir: entity.userDataDir });
}

/** Build Playwright launch options without launching browser */
export async function buildLaunchOptions(entity = {}) {
  const maestro = new Maestro();
  return maestro.buildLaunchOptions(entity);
}

/** highTrust preset */
export async function highTrust(entity = {}) {
  const maestro = new Maestro({ strategist: Strategist.highTrust() });
  const result = await maestro.launch({
    instincts: { hesitation: 0.8, precision: 0.95, curiosity: 0.7 },
    operate: { latency: 'human', headless: true },
    ...entity,
  });
  return result;
}

/** aggressive preset */
export async function aggressive(entity = {}) {
  const maestro = new Maestro({ strategist: Strategist.aggressive() });
  const result = await maestro.launch({
    instincts: { hesitation: 0.1, precision: 0.99, curiosity: 0.0 },
    operate: { latency: 'robotic', headless: true },
    ...entity,
  });
  return result;
}

export default { launch, createMaestro, launchContext, launchPersistentContext, buildLaunchOptions, highTrust, aggressive };