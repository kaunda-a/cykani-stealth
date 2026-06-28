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
export { walkOut, walkOutContext, walkOutBrowser, patchBrowser, CdpWorld } from './humor/strike.js';
export { resolveGeoip, COUNTRY_LOCALE_MAP } from './utils/geoip.js';
export { SessionState } from './utils/session.js';

export { IGNORE_DEFAULT_ARGS, DEFAULT_VIEWPORT } from './core/maestro.js';

/** Launch a browser with fluent session API — primary entry point */
export async function strike(entity = {}) {
  const maestro = new Maestro();
  return maestro.launch(entity);
}

/** Thematic alias — summon a browser session */
export const summon = strike;

/** Thematic alias — unleash a browser session */
export const unleash = strike;

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

/** Connect to a running cykani-browser instance over CDP */
export async function connectOverCDP(endpoint, entity = {}) {
  const maestro = new Maestro();
  return maestro.connectOverCDP(endpoint, entity);
}

/** highTrust preset — careful, human-like session with high hesitation */
export async function highTrust(entity = {}) {
  const maestro = new Maestro({ strategist: Strategist.highTrust() });
  const result = await maestro.launch({
    instincts: { hesitation: 0.8, precision: 0.95, curiosity: 0.7 },
    operate: { latency: 'human', headless: true },
    ...entity,
  });
  return result;
}

/** aggressive preset — fast, low-hesitation session for speed-critical tasks */
export async function aggressive(entity = {}) {
  const maestro = new Maestro({ strategist: Strategist.aggressive() });
  const result = await maestro.launch({
    instincts: { hesitation: 0.1, precision: 0.99, curiosity: 0.0 },
    operate: { latency: 'robotic', headless: true },
    ...entity,
  });
  return result;
}

/** humor preset — strike with humor mode (strike patching) enabled */
export async function humorLaunch(entity = {}) {
  return strike({ humor: true, ...entity });
}

/** natural preset — relaxed human browsing with humor + organic latency */
export async function natural(entity = {}) {
  return strike({
    humor: true,
    instincts: { hesitation: 0.6, precision: 0.7, curiosity: 0.5 },
    operate: { latency: 'organic', headless: true },
    ...entity,
  });
}

/** stealth preset — full triple-layer stealth with humor + low profile */
export async function stealth(entity = {}) {
  return strike({
    humor: true,
    instincts: { hesitation: 0.4, precision: 0.85, curiosity: 0.3 },
    operate: { latency: 'human', headless: false },
    ...entity,
  });
}

export const presets = {
  strike,
  summon,
  unleash,
  createMaestro,
  launchContext,
  launchPersistentContext,
  buildLaunchOptions,
  connectOverCDP,
  highTrust,
  aggressive,
  humorLaunch,
  natural,
  stealth,
};

export default presets;