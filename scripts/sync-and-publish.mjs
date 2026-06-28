import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const binaryVersion = process.env.BINARY_VERSION;
if (!binaryVersion) {
  console.error('BINARY_VERSION env required');
  process.exit(1);
}

// Update download.js
let downloadJs = readFileSync('src/download.js', 'utf8');
downloadJs = downloadJs.replace(
  /'linux-x64': '[0-9.]+'/,
  `'linux-x64': '${binaryVersion}'`
);
downloadJs = downloadJs.replace(
  /'linux-arm64': '[0-9.]+'/,
  `'linux-arm64': '${binaryVersion}'`
);
downloadJs = downloadJs.replace(
  /'darwin-arm64': '[0-9.]+'/,
  `'darwin-arm64': '${binaryVersion}'`
);
downloadJs = downloadJs.replace(
  /'darwin-x64': '[0-9.]+'/,
  `'darwin-x64': '${binaryVersion}'`
);
downloadJs = downloadJs.replace(
  /'win32-x64': '[0-9.]+'/,
  `'win32-x64': '${binaryVersion}'`
);
writeFileSync('src/download.js', downloadJs);

// Bump package.json version
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const parts = pkg.version.split('.').map(Number);
parts[2] += 1;
const newVersion = parts.join('.');
pkg.version = newVersion;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// Commit
execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
execSync('git config user.name "github-actions[bot]"');
execSync(`git add src/download.js package.json`);
execSync(`git commit -m "chore: sync wrapper v${newVersion} with binary v${binaryVersion}"`);
execSync('git push origin main');

console.log(`Ready to publish v${newVersion}`);
