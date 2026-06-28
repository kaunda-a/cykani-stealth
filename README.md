# cykani-stealth

Triple-layer stealth Chromium wrapper with fingerprint evasion, human-like behavior, heuristic extraction, and autonomous browsing.

```
strike()      # primary — deploy a stealth session
summon()      # thematic alias
unleash()     # powerful alias
```

## Install

```bash
npm install cykani-stealth
```

Requires a patched Chromium binary. Set `CYKANI_BINARY_PATH` to your cykani-browser build, or use the auto-download:

```bash
export CYKANI_DOWNLOAD_URL=https://your-server.com/binaries
```

## Quick Start

```javascript
import { strike } from 'cykani-stealth';

const session = await strike({
  humor: true,
  fingerprint: 1337,
});
await session.goto('https://example.com');
await session.autoPilot().signIn({ email: 'a@b.com', password: 'secret' });
await session.close();
```

## Entry Points

| Function | Description |
|---|---|
| `strike(entity)` | Primary — launch a stealth browser session |
| `summon(entity)` | Thematic alias |
| `unleash(entity)` | Thematic alias |
| `createMaestro(opts)` | Multi-session orchestrator |
| `launchContext(entity)` | Auto-closes browser on context close |
| `launchPersistentContext(entity)` | Uses user data dir (avoids incognito detection) |
| `connectOverCDP(endpoint, entity)` | Connect to running cykani-browser via CDP (Docker/remote) |

### Presets

```javascript
import { strike, highTrust, aggressive, humorLaunch, natural, stealth } from 'cykani-stealth';

await strike({ humor: true });           // raw, with humor
await humorLaunch();                      // strike with humor enabled
await natural();                          // humor + organic latency + balanced
await stealth();                          // humor + headed + human latency
await highTrust();                        // careful, hesitation 0.8
await aggressive();                       // fast, hesitation 0.1
```

Or via the `presets` object:

```javascript
import { presets } from 'cykani-stealth';
await presets.strike({ humor: true });
await presets.natural();
```

## Entity Configuration

```javascript
await strike({
  humor: true,                 // patch native page methods through Choreographer
  fingerprint: 1337,           // seed for deterministic fingerprint (1-10000)
  platform: 'windows',         // windows | macos | linux
  locale: 'en-US',             // navigator.language
  timezone: 'America/New_York',// Intl.DateTimeFormat timezone
  proxy: 'http://user:pass@host:port',
  viewport: { width: 1920, height: 1080 },
  userDataDir: '/tmp/my-profile',
  extensions: ['./path/to/ext'],
  operate: {
    latency: 'human',          // instant | robotic | organic | human | sluggish
    headless: true,
    timeout: 30000,
  },
  instincts: {
    hesitation: 0.5,           // pause before actions (0-1)
    precision: 0.7,            // mouse overshoot (0 = sloppy, 1 = pixel-perfect)
    curiosity: 0.3,            // idle exploration between actions (0-1)
  },
  dynamics: {
    entropy: 0.4,              // timing jitter (0-1)
    inertia: 0.5,              // mouse movement smoothness (0-1)
  },
});
```

## Three Automation Layers

### 1. DOM-First (explicit selectors)

```javascript
await session.click('#submit');
await session.fill('#email', 'user@site.com');
await session.type('#message', 'hello world');
await session.selectOption('#country', 'US');
await session.hover('#menu');
await session.dblclick('#item');
await session.uploadFile('#file', ['./photo.jpg']);
await session.scroll({ direction: 'down', amount: 500 });
await session.read();                      // smart scroll + hover through content
await session.wait('#selector');
await session.idle(2000);
await session.reload();
await session.goBack();
await session.goForward();
await session.screenshot({ fullPage: true });
await session.evaluate(() => document.title);
```

### 2. Heuristic Extraction (Perceptor + AutoPilot)

No selectors needed — the Perceptor scans the DOM by semantic role:

```javascript
const ap = session.autoPilot();

// Login
await ap.signIn({ email: 'user@site.com', password: 'secret' });
await ap.signUp({ email, password, name, phone });

// Search
await ap.search('cykani stealth');

// Pagination
await ap.paginate('next');

// Generic
await ap.findAndFill('email', 'user@site.com');
await ap.findAndClick('submit');
await ap.fillForm({ email: 'user@site.com', password: 'secret' });
```

Perceptor roles: `email`, `password`, `username`, `search`, `submit`, `textarea`, `phone`, `name`, `next`, `prev`, `checkbox`.

### 3. Autonomous (self-driving loop)

The autonomous layer analyzes the page, classifies its type, and chooses natural actions:

```javascript
const auto = session.autonomous();

// Browse naturally for 30 seconds
await auto.act(30000);

// Or let it drive decision-by-decision:
await auto.analyze();  // returns page analysis + page type
```

Page types detected: `captcha`, `login`, `signup`, `search`, `article`, `listing`, `sparse`, `generic`.

Actions chosen by type:
- **captcha** → idle (wait it out)
- **login** → scroll, hover form
- **article** → scroll-read, click links, idle
- **listing** → scroll, click items, paginate
- **sparse** → idle, scroll, go back
- **generic** → scroll, click links, hover links, idle

## Humor Mode (Strike Patching)

When `humor: true`, the native Playwright page methods are replaced with humanized versions that route through the Choreographer + EntityBrain:

```javascript
await strike({ humor: true });

// These now go through bezier curves + hesitation + drift + pointer checks:
await session.page().click('#btn');     // works too
await session.page().fill('#input', 'text');
await session.page().type('#field', 'hello');
await session.page().hover('#menu');
await session.page().dblclick('#item');
await session.page().goto('https://site.com');
```

Behaviors added by humor mode:

| Behavior | Description |
|---|---|
| `strikeMove` | Bezier curves with 15% distraction drift |
| `cognitiveHesitation` | Pause proportional to page complexity |
| `idleMicroMovement` | Tiny cursor jitter between actions |
| `coffeeBreak` | 8% chance of 2-7s idle with micro-movements |
| `checkPointerEvents` | Verifies no overlay intercepts click |
| `waitStable` | Polls element position until stable |
| `isInputElement` | Adjusts click target for input fields |

### Per-call humor config override

Override humor parameters on individual method calls:

```javascript
await session.click('#btn', { humor: { hesitation: 0.9, precision: 0.99 } });
await session.type('#input', 'text', { humor: { latency: 'sluggish' } });
await session.fill('#field', 'hello', { humor: { entropy: 0.8 } });
```

Supported overrides: `hesitation`, `precision`, `curiosity`, `entropy`, `latency`.

### Key hold durations

When `humor: true`, typing includes randomized key hold durations (key down → delay → key up) for each character, matching natural typing. 30% chance per action, controlled by `opts.keyHold`:

```javascript
await session.type('#input', 'hello', { keyHold: true });  // force key holds
await session.type('#input', 'hello', { keyHold: false });  // disable key holds
```

Hold duration varies by latency preset (instant: ~10ms, sluggish: ~100ms).

### CDP Isolated World (CdpWorld)

DOM queries for actionability checks (`isInputElement`, `checkPointerEvents`, `_strikeFocused`) go through a CDP isolated world instead of `page.evaluate()` when available. Produces clean `Error.stack` traces, invisible to `querySelector` monkey-patches. Invalidated on navigation, auto-recreated.

```javascript
import { CdpWorld } from 'cykani-stealth';

const world = new CdpWorld(page);
const isInput = await world.evaluate((sel) => {
  const el = document.querySelector(sel);
  return el?.tagName === 'INPUT';
}, '#email');
world.destroy();
```

### Shift-symbol typing via CDP

Uppercase letters and shifted symbols (`!@#$%^&*()_+{}|:"<>?~`) are typed via raw CDP `Input.dispatchKeyEvent` for `isTrusted=true` events. Falls back to `page.keyboard` when CDP unavailable.

### walkOutContext / walkOutBrowser

Apply humor to all pages in a context or browser:

```javascript
import { walkOutContext, walkOutBrowser } from 'cykani-stealth';

// All pages in a context
const cleanupCtx = walkOutContext(context, choreographer, brain);

// All pages in all contexts of a browser
const cleanupBrowser = walkOutBrowser(browser, choreographer, brain);

// Cleanup removes future-page listeners
cleanupBrowser();
```

### GeoIP auto-resolution

Set `geoip: true` in the entity to auto-detect timezone and locale from the proxy's exit IP (via ipify.org). Skips if explicit `timezone` + `locale` already set.

```javascript
await strike({
  proxy: 'http://user:pass@proxy:8080',
  geoip: true,          // resolves timezone + locale from proxy IP
});
```

Also auto-injects `--fingerprint-webrtc-ip=auto` when a proxy is set (disable with `webrtcIp: false`).

## Session Proxy

```javascript
const session = await strike({ humor: true });

session.id                              // unique session ID
session.page()                          // raw Playwright Page
session.autoPilot()                     // AutoPilot instance
session.autonomous()                    // Autonomous instance
session.brain()                         // EntityBrain instance
session.cookies()                       // CookieJar
session.record()                        // Recorder (action logs)
session.har()                           // HAR object
session.exportHar('./session.har')      // write HAR to file
session.state()                         // session metadata
session.close()                         // terminate session

// Event listeners
session.on('close', () => {});
session.off('close', fn);
```

## CLI

```bash
cykani-stealth --url=https://example.com
cykani-stealth --url=https://example.com --humor
cykani-stealth --url=https://example.com --humor --auto=30
cykani-stealth --test=sannysoft --fingerprint=42
```

| Flag | Description |
|---|---|
| `--url=<url>` | Navigate to URL |
| `--humor` | Enable humor mode (strike patching) |
| `--auto=<sec>` | Autonomous browsing duration in seconds |
| `--fingerprint=<n>` | Fingerprint seed (1-10000) |
| `--proxy=<url>` | HTTP/SOCKS proxy |
| `--headful` | Show browser window |
| `--test=sannysoft` | Run stealth diagnostic |
| `--script=<file>` | Execute action script |
| `--screenshot=<path>` | Save screenshot |
| `--cookies-from=<file>` | Load cookies from JSON |
| `--export-har=<file>` | Export HAR to file |
| `--timeout=<ms>` | Navigation timeout |
| `--config=<file>` | Load entity config from JSON |
| `--help, -h` | Show help |

### Script format

```javascript
export default [
  { type: 'goto', url: 'https://example.com' },
  { type: 'wait', wait: 1000 },
  { type: 'click', selector: '#btn' },
  { type: 'type', selector: '#input', text: 'hello' },
  { type: 'screenshot' },
];
```

Or a function:

```javascript
export default async (session) => {
  await session.goto('https://example.com');
  await session.autoPilot().signIn({ email: 'a@b.com', password: 'secret' });
};
```

## CDP Connection

Connect to a running cykani-browser instance (Docker, remote server, or `cloakserve`) via CDP:

```javascript
import { connectOverCDP } from 'cykani-stealth';

// Connect to a CDP WebSocket endpoint
const session = await connectOverCDP('ws://127.0.0.1:9222/devtools/browser/...', {
  humor: true,
});

// Or pass an HTTP endpoint (auto-resolves to WebSocket URL)
const session = await connectOverCDP('http://127.0.0.1:9222', {
  humor: true,
});

// Full session proxy available (goto, click, autoPilot, etc.)
await session.goto('https://example.com');
await session.autoPilot().signIn({ email: 'a@b.com', password: 'secret' });
await session.close();  // closes the CDP browser connection
```

The CDP connection supports all session proxy methods including humor patching, AutoPilot, Autonomous, telemetry, and event listeners.

## Session State Persistence

Save and restore cookies, localStorage, and sessionStorage across browsing sessions:

```javascript
import { SessionState } from 'cykani-stealth';

const state = new SessionState('./session-state.json');

// Capture current session state
await state.importFromPage(page);
console.log(state.data.cookies.length, 'cookies saved');

// Restore state in a new session
await state.exportToPage(page);
```

The `diff()` method detects changes between two states (cookie count, storage keys).

## Binary Auto-Update

The SDK checks for newer cykani-browser releases in the background 5 seconds after load. It compares versions using GitHub's release API and logs when an update is available:

```javascript
import { checkForUpdates } from 'cykani-stealth';

// Sync check (blocking)
const result = await checkForUpdates({ sync: true });
if (result.updateAvailable) {
  console.log(`Update: v${result.current} → v${result.latest}`);
}

// Background check (non-blocking, logs to console)
checkForUpdates();
```

Disable auto-updates with `CYKANI_NO_UPDATE=1` or `CLOAKBROWSER_AUTO_UPDATE=false` env var.

## Low-Level API

```javascript
import {
  Maestro,           // session orchestrator
  EntityBrain,       // physics-based behavior engine
  Choreographer,     // fluent automation DSL
  Sentinel,          // circuit breaker
  Poolize,           // session pool with proxy rotation
  CookieJar,         // cookie persistence
  Hooks,             // plugin/event system
  Telemetry,         // session recording + HAR
  Strategist,        // per-site behavioral profiles
  Observer,          // page monitoring + captcha detection
  Perceptor,         // heuristic DOM scorer
  AutoPilot,         // heuristic action sequencer
  Autonomous,        // self-driving browsing loop
  Recorder,          // action log recorder
  Diagnostic,        // stealth quality report
  Visual,            // visual debugging
  Perceptual,        // fingerprint-aware patches
  WebSocketInterceptor, // WebSocket patching
  StealthEval,       // stealth JS sandbox

  // Error types
  StealthError,
  ValidationError,
  SessionError,
  CaptchaError,
  BrowserError,

  // Utilities
  validateEntity,
  assertValidEntity,
  resolveProxyConfig,
  ProxyManager,
  CaptchaSolver,
  ensureBinary,
  binaryInfo,
  clearCache,
  walkOut,
  walkOutContext,
  walkOutBrowser,
  patchBrowser,
  CdpWorld,
  resolveGeoip,
  COUNTRY_LOCALE_MAP,
  SessionState,
  checkForUpdates,
} from 'cykani-stealth';
```

## Architecture

```
CLI / SDK / Script
  │
  ├── connectOverCDP(endpoint)
  │     └── chromium.connectOverCDP()   — remote/Docker browser
  │
  ├── strike(entity)
  │     ├── chromium.launch()           — C++ patched binary
  │     ├── EntityBrain                 — seeded PRNG, bezier curves
  │     ├── Choreographer               — stealth injection, observer, DSL
  │     │     ├── walkOut()             — page method patching (humor)
  │     │     ├── CdpWorld()            — CDP isolated world (stealth DOM queries)
  │     │     ├── walkOutContext()      — patch all pages in a context
  │     │     └── walkOutBrowser()      — patch all contexts/pages in a browser
  │     └── Session Proxy               — 28 methods + autoPilot + autonomous
  │
  ├── Perceptor                         — heuristic DOM analysis
  ├── AutoPilot                         — action sequences
  └── Autonomous                        — self-driving loop
        ├── analyze
        ├── classify
        ├── pickAction
        └── act → self-correct
```

## Testing

```bash
npm test                 # 150 unit tests
npm run test:ci          # same (CI)
npm run test:integration # real browser (requires playwright-core + binary)
npm run test:all         # both
npm run test:detect      # bot detection sites (requires binary)
```

### Detection test

```bash
# Run against 5 detection sites (requires cykani-browser binary)
CYKANI_BINARY_PATH=/path/to/chrome node tests/detect.js

# Mock mode (no binary needed)
node tests/detect.js --mock
```

Sites tested: `sannysoft`, `browserscan`, `fingerprintjs`, `incolumitas`, `deviceandbrowserinfo.com`, `creepjs`, `fingerprintscan`, `browserleaks`.
