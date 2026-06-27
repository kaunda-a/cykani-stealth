# cykani-stealth

Stealth Chromium wrapper with fingerprint evasion and human-like behavior.

## Installation

```bash
npm install cykani-stealth
```

Requires `CYKANI_BINARY_PATH` environment variable pointing to a cykani-browser (patched Chromium) binary.

## Quick Start

```javascript
import { launch, launchContext, launchPersistentContext } from 'cykani-stealth';

// Simple usage
const session = await launch({ fingerprint: 7 });
await session.goto('https://example.com');
await session.click('button#submit');
await session.close();

// Multi-session orchestration
const sessions = await Promise.all([
  launch({ fingerprint: 7 }),
  launch({ fingerprint: 42 }),
]);

// Persistent context (avoids incognito detection)
const session = await launchPersistentContext({
  fingerprint: 42,
  userDataDir: './chrome-profile',
});
```

## API

| Function | Description |
|----------|-------------|
| `launch(entity)` | Browser + page with fluent session API |
| `launchContext(entity)` | BrowserContext that auto-closes browser on close |
| `launchPersistentContext(entity)` | Persistent context with profile directory |
| `buildLaunchOptions(entity)` | Get Playwright options for custom integration |

## Presets

```javascript
import { highTrust, aggressive } from 'cykani-stealth';

const careful = await highTrust({ fingerprint: 7 });
const fast = await aggressive({ fingerprint: 13 });
```

## Features

| Feature | Description |
|---------|-------------|
| EntityBrain | Physics-based timing, mouse curves with overshoot, typing simulation |
| Constellation | CDP runtime patches (navigator.webdriver, chrome.runtime, permissions) |
| Phantom | Extended JS-level fingerprint spoofing (audio, canvas, WebGL) |
| Perceptual | Per-session fingerprint randomization |
| Choreographer | Fluent chainable action DSL |
| Sentinel | Circuit breaker, exponential backoff, health metrics |
| Weave | Request interception, header normalization |
| Diagnostic | Stealth verification toolkit |
| Visual | Screenshot regression testing |
| Poolize | Proxy rotation + health-aware load balancing |
| Hooks | Plugin architecture |

## Entity Configuration

```javascript
const entity = {
  fingerprint: 7,           // Seed 1-10000
  platform: 'windows',      // windows | macos | linux
  locale: 'en-US',
  timezone: 'America/New_York',
  viewport: { width: 1920, height: 947 }, // headless: auto; headed: null
  userDataDir: './profile', // for persistent context
  proxy: 'http://proxy:3128',
  binary: '/path/to/chrome', // override CYKANI_BINARY_PATH

  instincts: {
    hesitation: 0.3,    // 0-1, higher = longer pauses
    precision: 0.8,   // 0-1, higher = cleaner mouse
    curiosity: 0.5,   // 0-1, higher = more exploration
  },

  dynamics: {
    entropy: 0.2,    // Timing randomness
    inertia: 0.5,    // Behavior consistency
  },

  operate: {
    latency: 'human', // instant | robotic | organic | human | sluggish
    headless: true,
  },
};
```

## License

MIT