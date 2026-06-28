// Type declarations for cykani-stealth-warp

export { Maestro } from './core/maestro.js';
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
export { validateEntity, assertValidEntity } from './utils/validate.js';
export { StealthError, ValidationError, SessionError, CaptchaError, BrowserError } from './utils/errors.js';
export { walkOut, walkOutContext, walkOutBrowser, patchBrowser, CdpWorld } from './humor/strike.js';
export { resolveGeoip, COUNTRY_LOCALE_MAP } from './utils/geoip.js';
export { SessionState } from './utils/session.js';

// CdpWorld declaration
export class CdpWorld {
  constructor(page: any);
  evaluate(fn: Function, ...args: any[]): Promise<any>;
  invalidate(): void;
  destroy(): Promise<void>;
}

export class SessionState {
  constructor(filePath?: string);
  load(): Promise<void>;
  persist(data?: any): Promise<void>;
  importFromPage(page: any): Promise<any>;
  exportToPage(page: any): Promise<void>;
  diff(other?: any): string[];
}

export const IGNORE_DEFAULT_ARGS: string[];
export const DEFAULT_VIEWPORT: { width: number; height: number };

export interface Session {
  id: string;
  page: () => any;
  goto: (url: string, opts?: any) => Promise<Session>;
  click: (sel: string, opts?: any) => Promise<Session>;
  dblclick: (sel: string, opts?: any) => Promise<Session>;
  hover: (sel: string, opts?: any) => Promise<Session>;
  type: (sel: string, text: string, opts?: any) => Promise<Session>;
  fill: (sel: string, text: string, opts?: any) => Promise<Session>;
  selectOption: (sel: string, values: string | string[], opts?: any) => Promise<Session>;
  uploadFile: (sel: string, filePaths: string | string[]) => Promise<Session>;
  scroll: (opts?: any) => Promise<Session>;
  read: (opts?: any) => Promise<Session>;
  reload: (opts?: any) => Promise<Session>;
  goBack: (opts?: any) => Promise<Session>;
  goForward: (opts?: any) => Promise<Session>;
  idle: (ms?: number) => Promise<Session>;
  wait: (cond: any, opts?: any) => Promise<Session>;
  screenshot: (opts?: any) => Promise<Session>;
  eval: (fn: Function, ...args: any[]) => Promise<Session>;
  evaluate: (fn: Function, ...args: any[]) => Promise<any>;
  url: () => Promise<string>;
  title: () => Promise<string>;
  content: () => Promise<string>;
  close: () => Promise<void>;
  state: () => any;
  cookies: () => CookieJar;
  brain: () => EntityBrain;
  record: () => Recorder;
  autoPilot: () => AutoPilot;
  autonomous: () => Autonomous;
  har: () => any;
  exportHar: (filePath?: string) => Promise<any>;
  on: (event: string, fn: Function) => void;
  off: (event: string, fn: Function) => void;
}

export function strike(entity?: any): Promise<Session>;
export function summon(entity?: any): Promise<Session>;
export function unleash(entity?: any): Promise<Session>;
export function createMaestro(opts?: any): Maestro;
export function launchContext(entity?: any): Promise<Session>;
export function launchPersistentContext(entity?: any): Promise<Session>;
export function buildLaunchOptions(entity?: any): Promise<any>;
export function connectOverCDP(endpoint: string, entity?: any): Promise<Session>;
export function highTrust(entity?: any): Promise<Session>;
export function aggressive(entity?: any): Promise<Session>;
export function humorLaunch(entity?: any): Promise<Session>;
export function natural(entity?: any): Promise<Session>;
export function stealth(entity?: any): Promise<Session>;

export const presets: {
  strike: typeof strike;
  summon: typeof summon;
  unleash: typeof unleash;
  createMaestro: typeof createMaestro;
  launchContext: typeof launchContext;
  launchPersistentContext: typeof launchPersistentContext;
  buildLaunchOptions: typeof buildLaunchOptions;
  connectOverCDP: typeof connectOverCDP;
  highTrust: typeof highTrust;
  aggressive: typeof aggressive;
  humorLaunch: typeof humorLaunch;
  natural: typeof natural;
  stealth: typeof stealth;
};
