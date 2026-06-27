// Stealth verification against sannysoft.de bot detection suite
// Run with: CYKANI_BINARY_PATH=/path/to/chrome node examples/stealth-check.js

import { launch, Diagnostic } from '../src/index.js';

async function main() {
  const session = await launch({ fingerprint: 7 });

  console.log('Testing against sannysoft.de...');
  await session.goto('https://bot.sannysoft.com');

  // Diagnostic needs the page; session returns page via session.page()
  const page = session;
  if (page && typeof page.goto === 'function') {
    // session is already the page-like proxy, get the actual page
    const realPage = session;
    const diagnostic = new Diagnostic(realPage);
    await diagnostic.runAll();

    const report = diagnostic.report();
    console.log('Stealth Report:');
    console.log(JSON.stringify(report, null, 2));

    const safe = Object.values(report.results).filter(r => r.safe).length;
    const total = Object.keys(report.results).length;
    console.log(`Stealth score: ${safe}/${total}`);
  } else {
    console.log('No page available for diagnostic');
  }

  await session.screenshot({ path: 'stealth-test.png' });
  await session.close();
}

main().catch(console.error);