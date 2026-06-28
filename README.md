# cykani-stealth

Stealth Chromium wrapper with fingerprint evasion and human-like behavior.

## Installation

```bash
npm install cykani-stealth
```

**Binary Distribution (Private):**

The cykani-stealth npm package contains only the JavaScript wrapper (~106kB).
The patched Chromium binary is distributed privately for anti-detection protection.

**Setup Options:**

```bash
# Option 1: Local binary (recommended for development)
export CYKANI_BINARY_PATH=/path/to/cykani-browser/chrome

# Option 2: Private endpoint
export CYKANI_DOWNLOAD_URL=https://your-server.com/binaries

# Option 3: Manual install via CLI
CYKANI_DOWNLOAD_URL=https://your-server.com/binaries npx cykani-stealth install
```

## Quick Start

```javascript
import { launch } from 'cykani-stealth';

// Uses CYKANI_BINARY_PATH or downloads via CYKANI_DOWNLOAD_URL
const session = await launch({ fingerprint: 7 });
await session.goto('https://example.com');
await session.close();
```

## CLI

```bash
# Install binary (requires CYKANI_DOWNLOAD_URL)
CYKANI_DOWNLOAD_URL=https://your-server.com/binaries cykani-stealth install

# Quick test
CYKANI_BINARY_PATH=/path/to/chrome cykani-stealth --url=https://example.com --fingerprint=7

# Sannysoft stealth test
CYKANI_BINARY_PATH=/path/to/chrome cykani-stealth --test=sannysoft --fingerprint=42
```

## API (same as before)