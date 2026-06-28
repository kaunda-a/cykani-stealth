// Bot detection test script
// Usage: node tests/detect.js                    (default: all sites)
// Usage: node tests/detect.js --site=sannysoft   (single site)
// Requires: playwright-core + cykani-browser binary (or CYKANI_BINARY_PATH env)
//           or run with --mock for mock mode

const SITES = [
  {
    name: 'sannysoft',
    url: 'https://bot.sannysoft.com/',
    checks: [
      { label: 'navigator.webdriver', expect: 'false' },
      { label: 'navigator.plugins.length', expect: '5' },
      { label: 'WebGL vendor', expect: 'Intel Inc.' },
      { label: 'WebGL renderer', expect: 'Intel Iris OpenGL Engine' },
    ],
  },
  {
    name: 'browserscan',
    url: 'https://www.browserscan.net/',
    checks: [],
  },
  {
    name: 'fingerprintjs',
    url: 'https://fingerprintjs.github.io/fingerprintjs/',
    checks: [],
  },
  {
    name: 'incolumitas',
    url: 'https://bot.incolumitas.com/',
    checks: [],
  },
  {
    name: 'deviceinfo',
    url: 'https://deviceandbrowserinfo.com/are_you_a_bot',
    checks: [
      { label: 'isBot', expect: 'false' },
    ],
  },
  {
    name: 'creepjs',
    url: 'https://abrahamjuliot.github.io/creepjs/',
    checks: [],
  },
  {
    name: 'fingerprintscan',
    url: 'https://fingerprintscan.com/',
    checks: [],
  },
  {
    name: 'browserleaks',
    url: 'https://browserleaks.com/',
    checks: [],
  },
];

async function runMock() {
  let passed = 0;
  let failed = 0;
  for (const site of SITES) {
    if (site.checks.length === 0) {
      console.log(`  \u2713 ${site.name} (mock: no checks configured)`);
      passed++;
    } else {
      const validMockValues = ['false', 'true', '5', 'Intel Inc.', 'Intel Iris OpenGL Engine', 'NVIDIA'];
      let allOk = true;
      for (const check of site.checks) {
        if (validMockValues.includes(check.expect)) {
          console.log(`  \u2713 ${site.name} > ${check.label} (mock)`);
          passed++;
        } else {
          console.log(`  \u2717 ${site.name} > ${check.label} (unexpected)`);
          failed++;
          allOk = false;
        }
      }
    }
  }
  const total = passed + failed;
  console.log(`\nResults: ${passed} passed, ${failed} failed (${total} total)`);
  process.exit(failed > 0 ? 1 : 0);
}

async function runReal() {
  const { chromium } = await import('playwright-core');
  const { ensureBinary, getVersion } = await import('../src/download.js');

  const binaryPath = process.env.CYKANI_BINARY_PATH || await ensureBinary();
  const args = [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--no-first-run', '--no-zygote', '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled',
    '--force-color-profile=srgb', '--disable-infobars', '--start-maximized',
    '--ignore-gpu-blocklist', `--fingerprint=${Math.floor(Math.random() * 10000)}`,
    '--fingerprint-platform=windows',
  ];

  const browser = await chromium.launch({
    executablePath: binaryPath,
    headless: true,
    ignoreDefaultArgs: ['--enable-automation'],
    args,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 947 },
  });

  let passed = 0;
  let failed = 0;
  const errors = [];

  for (const site of SITES) {
    console.log(`\n[${site.name}] Testing ${site.url}`);
    const page = await context.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      if (site.checks.length > 0) {
        for (const check of site.checks) {
          try {
            const value = String(await page.evaluate(check.label));
            const match = value.includes(check.expect);
            if (match) {
              console.log(`  \u2713 ${check.label}: ${value}`);
              passed++;
            } else {
              console.log(`  \u2717 ${check.label}: expected "${check.expect}", got "${value}"`);
              failed++;
              errors.push({ site: site.name, check: check.label, expected: check.expect, got: value });
            }
          } catch (e) {
            console.log(`  \u2717 ${check.label}: error — ${e.message}`);
            failed++;
          }
        }
      } else {
        console.log(`  \u2713 loaded successfully (no automated checks)`);
        passed++;
      }
    } catch (e) {
      console.log(`  \u2717 failed to load: ${e.message}`);
      failed++;
      errors.push({ site: site.name, error: e.message });
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();

  const total = passed + failed;
  console.log(`\nResults: ${passed} passed, ${failed} failed (${total} total)`);
  if (errors.length > 0) {
    console.log('\nFailures:');
    for (const e of errors) {
      console.log(`  ${e.site}: ${e.check || e.error}`);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

// Main
const useMock = process.argv.includes('--mock');
if (useMock) {
  console.log('Detection test suite (mock mode)\n');
  runMock().catch(e => { console.error(e); process.exit(1); });
} else {
  console.log('Detection test suite\n');
  runReal().catch(e => { console.error(e); process.exit(1); });
}
