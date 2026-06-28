#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { strike, createMaestro } from './index.js';
import { Diagnostic } from './agents/diagnostic.js';

const args = process.argv.slice(2);
const opts = {};
const configFiles = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--fingerprint=')) opts.fingerprint = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--url=')) opts.url = arg.split('=')[1];
  else if (arg.startsWith('--test=')) opts.test = arg.split('=')[1];
  else if (arg.startsWith('--proxy=')) opts.proxy = arg.split('=')[1];
  else if (arg.startsWith('--script=')) opts.script = arg.split('=')[1];
  else if (arg.startsWith('--cookies-from=')) opts.cookiesFrom = arg.split('=')[1];
  else if (arg.startsWith('--export-har=')) opts.exportHar = arg.split('=')[1];
  else if (arg.startsWith('--screenshot=')) opts.screenshotPath = arg.split('=')[1];
  else if (arg.startsWith('--timeout=')) opts.timeout = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--config=')) configFiles.push(arg.split('=')[1]);
  else if (arg.startsWith('--auto=')) opts.auto = parseInt(arg.split('=')[1], 10);
  else if (arg === '--headful') opts.headless = false;
  else if (arg === '--humor') opts.humor = true;
  else if (arg === '--help' || arg === '-h') { opts.help = true; }
}

for (const configFile of configFiles) {
  try {
    if (existsSync(configFile)) {
      const config = JSON.parse(readFileSync(configFile, 'utf-8'));
      Object.assign(opts, config);
      console.log(`Loaded config: ${configFile}`);
    }
  } catch (e) {
    console.error(`Failed to load config ${configFile}: ${e.message}`);
  }
}

if (opts.help) {
  console.log('cykani-stealth CLI');
  console.log('');
  console.log('Options:');
  console.log('  --url=<url>              Navigate to a URL');
  console.log('  --humor                  Enable humor mode (strike patching)');
  console.log('  --auto=<sec>             Autonomous browsing duration (seconds)');
  console.log('  --fingerprint=<n>        Fingerprint seed (1-10000, default 7)');
  console.log('  --proxy=<url>            HTTP/SOCKS proxy (e.g. socks5://127.0.0.1:9050)');
  console.log('  --test=sannysoft         Run stealth diagnostic on bot.sannysoft.com');
  console.log('  --script=<file>          Execute actions from a JS file');
  console.log('  --screenshot=<path>      Save screenshot to file');
  console.log('  --cookies-from=<file>    Load cookies from JSON file');
  console.log('  --export-har=<file>      Export HAR to file');
  console.log('  --timeout=<ms>           Navigation timeout (default 30000)');
  console.log('  --config=<file>          Load entity config from JSON file');
  console.log('  --headful                Show browser window');
  console.log('  --help, -h               Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  cykani-stealth --url=https://example.com --humor --auto=30');
  console.log('  cykani-stealth --url=https://example.com --screenshot=page.png');
  console.log('  cykani-stealth --test=sannysoft --fingerprint=42');
  console.log('  cykani-stealth --url=https://example.com --script=./actions.js');
  process.exit(0);
}

const entity = {
  fingerprint: opts.fingerprint ?? 7,
  proxy: opts.proxy,
  humor: opts.humor ?? false,
  operate: { headless: opts.headless ?? true, timeout: opts.timeout },
};

async function loadCookies(session, filePath) {
  if (!filePath || !existsSync(filePath)) return;
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    const jar = session.cookies();
    if (Array.isArray(data)) {
      for (const c of data) {
        jar.set(c.domain ? `https://${c.domain}` : 'https://localhost', c);
      }
    }
    const page = session.page();
    const context = page.context();
    await jar.exportToContext(context);
    console.log(`Loaded ${Array.isArray(data) ? data.length : 0} cookies from ${filePath}`);
  } catch (e) {
    console.error(`Failed to load cookies: ${e.message}`);
  }
}

async function runScript(session, filePath) {
  if (!filePath || !existsSync(filePath)) return;
  try {
    const mod = await import(filePath);
    const actions = mod.default || mod.actions || mod;
    if (typeof actions === 'function') {
      await actions(session);
    } else if (Array.isArray(actions)) {
      for (const action of actions) {
        const { type, selector, text, url, wait } = action;
        if (type === 'goto' && url) await session.goto(url);
        else if (type === 'click' && selector) await session.click(selector);
        else if (type === 'type' && selector && text) await session.type(selector, text);
        else if (type === 'scroll') await session.scroll(action);
        else if (type === 'wait' && wait) await session.wait(wait);
        else if (type === 'screenshot') await session.screenshot(action);
      }
    }
    console.log(`Executed script: ${filePath}`);
  } catch (e) {
    console.error(`Script error: ${e.message}`);
  }
}

if (opts.test === 'sannysoft') {
  const session = await strike(entity);
  await loadCookies(session, opts.cookiesFrom);
  await session.goto('https://bot.sannysoft.com');
  const page = session.page();
  const diagnostic = new Diagnostic(page);
  await diagnostic.runAll();
  console.log('Stealth Report:');
  console.log(JSON.stringify(diagnostic.report(), null, 2));
  if (opts.exportHar) {
    const { Telemetry } = await import('./agents/telemetry.js');
    const har = new Telemetry().exportHar();
    const { writeFileSync } = await import('fs');
    writeFileSync(opts.exportHar, JSON.stringify(har, null, 2));
    console.log(`HAR exported to ${opts.exportHar}`);
  }
  await session.close();
} else if (opts.url) {
  const session = await strike(entity);
  await loadCookies(session, opts.cookiesFrom);
  await session.goto(opts.url);

  if (opts.auto) {
    console.log(`Autonomous browsing for ${opts.auto}s...`);
    await session.autonomous().act(opts.auto * 1000);
  } else {
    await runScript(session, opts.script);
  }

  if (opts.screenshotPath) {
    const buf = await session.screenshot();
    const { writeFileSync } = await import('fs');
    writeFileSync(opts.screenshotPath, buf);
    console.log(`Screenshot saved to ${opts.screenshotPath}`);
  }
  if (opts.exportHar) {
    const { writeFileSync } = await import('fs');
    const har = await session.exportHar();
    writeFileSync(opts.exportHar, JSON.stringify(har, null, 2));
    console.log(`HAR exported to ${opts.exportHar}`);
  }
  await session.close();
} else {
  console.log('Usage: cykani-stealth --url=<url> [options]');
  console.log('       cykani-stealth --test=sannysoft [options]');
  console.log('       cykani-stealth --help');
  process.exit(1);
}
