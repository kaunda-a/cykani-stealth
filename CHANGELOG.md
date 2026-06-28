# Changelog

## 1.1.0 (2026-06-28)

### Added
- **Session API expansion**: `reload()`, `goBack()`, `goForward()`, `fill()`, `selectOption()`, `uploadFile()`, `evaluate()`, `url()`, `title()`, `content()`, `on()`/`off()`, `har()`, `exportHar()`
- **Custom error types** (`src/utils/errors.js`): `StealthError`, `ValidationError`, `SessionError`, `CaptchaError`, `BrowserError` with typed codes and details
- **Stealth coverage**: WebGPU `requestAdapter` spoofing, WebCodecs `MediaSource.isTypeSupported` restriction, WebTransport constructor wrapping, `SharedArrayBuffer` suppression, `requestIdleCallback` delay randomization, `getClientRects` noise injection
- **Telemetry persistence**: `writeHar()`, `writeMetrics()`, `appendToLog()` methods for file-based export
- **Config file support**: `--config=profile.json` loads full Entity from JSON (last-wins with CLI args)
- **Runtime config validation** (`src/utils/validate.js`): `validateEntity()` + `assertValidEntity()` — validates Entity shape, types, ranges before launch; integrated into all Maestro entry points
- **Pool factory wired**: Maestro passes a recovery factory to Poolize — broken sessions auto-close and re-launch with incremented fingerprint
- **Extended CLI**: `--script=<file>`, `--cookies-from=<file>`, `--export-har=<file>`, `--screenshot=<path>`, `--timeout=<ms>`, `--config=<file>`, `--help`
- **`ensureActionable` checks**: validates `disabled`, `readonly`, `pointer-events: none` before click/type
- **seeded PRNG** (`helpers.createSeededRng`): deterministic mulberry32 — mouse curves, delays, typos reproducible per `fingerprint` seed
- **Observer ↔ Strategist** bridge: captcha results in `goto()` feed into strategist adaptation
- **CookieJar sync**: `importFromContext()`/`exportToContext()` bridges jar ↔ Playwright `BrowserContext`
- **TypeScript declarations** (`src/index.d.ts`): typed exports for all public API symbols
- **Choreographer.type() error boundaries**: keystroke-level recovery with re-focus on failure
- **Comprehensive test suite** (98 unit tests): entity brain, stealth strings, cookies, pool, sentinel, hooks, helpers, validation, errors
- **Integration test harness**: graceful skip when binary unavailable, CI-ready with xvfb

### Fixed
- **constellation.js**: strict-mode `webdriver` delete (now uses `defineProperty`), removed duplicate `permissions.query`, added missing `WebGL2RenderingContext` patch
- **phantom.js**: `plugins`/`mimeTypes` now inherit correct `PluginArray`/`MimeTypeArray` prototypes
- **maestro.js**: `_resolveBinary` falls back to auto-download via `ensureBinary()`; persistent context sessions close properly; strategist wired to choreographer
- **poolize.js**: `_recoverSession` uses configurable `factory` instead of silently returning `null`
- **sentinel.js**: `getHealth()` no longer divides by zero
- **hooks.js**: async detection uses duck-typing (`then`) instead of fragile `constructor.name` check

## 1.0.0 (2026-06-27)

### Added
- Initial release: stealth Chromium wrapper with fingerprint evasion
- Constellation, Phantom, and Perceptual stealth injection
- Human-like behavior engine (EntityBrain, Choreographer)
- Session orchestration (Maestro, Sentinel, Poolize)
- Cursor overlay with chip-favicon logo
- CDP is world, isTrusted keyboard, cubic Bezier mouse curves
