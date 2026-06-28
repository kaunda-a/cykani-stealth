# Changelog

## 1.1.0 (2026-06-28)

### Added
- **Captcha integration** (`src/utils/captcha.js`) — Solve reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile via CapSolver, 2captcha, Anti-Captcha
- **Webhook diagnostics** (`src/utils/webhook.js`) — Send scan results to Slack, Discord, Telegram, or generic HTTP webhooks
- **Enhanced proxy rotation** (`src/utils/proxy.js`) — Health checks with cooldown, automatic failure recovery, and status reporting
- **Session pool auto-recovery** (`src/utils/poolize.js`) — Mark broken sessions for automatic replacement with configurable retry

## 1.0.0 (2026-06-27)

### Added
- Initial release: stealth Chromium wrapper with fingerprint evasion
- Constellation, Phantom, and Perceptual stealth injection
- Human-like behavior engine (EntityBrain, Choreographer)
- Session orchestration (Maestro, Sentinel, Poolize)
- Cursor overlay with chip-favicon logo
- CDP is world, isTrusted keyboard, cubic Bezier mouse curves
