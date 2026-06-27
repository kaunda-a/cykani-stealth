#!/usr/bin/env node
// CLI for quick cykani-stealth testing

import { launch } from './src/index.js';
import { Diagnostic } from './src/agents/diagnostic.js';

const args = process.argv.slice(2);
const opts = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--fingerprint=')) opts.fingerprint = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--url=')) opts.url = arg.split('=')[1];
  else if (arg.startsWith('--test=')) opts.test = arg.split('=')[1];
  else if (arg.startsWith('--proxy=')) opts.proxy = arg.split('=')[1];
  else if (arg === '--headful') opts.headless = false;
}

const entity = {
  fingerprint: opts.fingerprint ?? 7,
  proxy: opts.proxy,
  operate: { headless: opts.headless ?? true },
};

if (opts.test === 'sannysoft') {
  const session = await launch(entity);
  await session.goto('https://bot.sannysoft.com');
  const page = session.page();
  const diagnostic = new Diagnostic(page);
  await diagnostic.runAll();
  console.log('Stealth Report:');
  console.log(JSON.stringify(diagnostic.report(), null, 2));
  await session.close();
} else if (opts.url) {
  const session = await launch(entity);
  await session.goto(opts.url);
  await session.wait(2000);
  const buf = await session.screenshot();
  console.log(`Visited ${opts.url}, screenshot ready`);
  await session.close();
} else {
  console.log('Usage:');
  console.log('  node cli.js --test=sannysoft --fingerprint=42');
  console.log('  node cli.js --url=https://example.com --fingerprint=7');
  process.exit(1);
}