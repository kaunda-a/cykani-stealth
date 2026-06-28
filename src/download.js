// Binary manager — auto-download, cache, and version-pin the cykani-browser binary
// Binary releases are hosted on the cykani-stealth repository.

import { existsSync, mkdirSync, rmSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { createWriteStream, renameSync } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';

const CACHE_DIR = join(homedir(), '.cykani-stealth');
const GITHUB_ORG = 'kaunda-a';
const REPO = 'cykani-stealth';

const PLATFORM_VERSIONS = {
  'linux-x64': '1.0.1',
  'linux-arm64': '1.0.1',
  'darwin-arm64': '1.0.1',
  'darwin-x64': '1.0.1',
  'win32-x64': '1.0.1',
};

function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === 'linux' && arch === 'x64') return 'linux-x64';
  if (platform === 'linux' && arch === 'arm64') return 'linux-arm64';
  if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64';
  if (platform === 'darwin' && arch === 'x64') return 'darwin-x64';
  if (platform === 'win32' && arch === 'x64') return 'win32-x64';
  return 'linux-x64';
}

function getVersion() {
  return process.env.CYKANI_VERSION || PLATFORM_VERSIONS[getPlatform()];
}

function getCacheDir(version) {
  const v = version || getVersion();
  return process.env.CYKANI_STEALTH_CACHE || join(CACHE_DIR, `cykani-browser-v${v}`);
}

function getBinaryPath(version) {
  const cacheDir = getCacheDir(version);
  const platform = getPlatform();
  if (platform.startsWith('darwin')) {
    return join(cacheDir, 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
  }
  if (platform.startsWith('win32')) {
    return join(cacheDir, 'chrome.exe');
  }
  return join(cacheDir, 'chrome');
}

function getReleaseUrl(version, platform) {
  const base = `https://github.com/${GITHUB_ORG}/${REPO}/releases/download/cykani-browser-v${version}`;
  const archive = `cykani-browser-v${version}-${platform}.tar.gz`;
  return `${base}/${archive}`;
}

async function downloadFile(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  }
  const tmp = dest + '.tmp';
  const stream = createWriteStream(tmp);
  if (response.body) {
    await pipeline(Readable.from(response.body), stream);
  }
  renameSync(tmp, dest);
  if (process.platform !== 'win32') {
    chmodSync(dest, 0o755);
  }
}

async function extractTar(archivePath, destDir) {
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
  }
  mkdirSync(destDir, { recursive: true });
  execSync(`tar -xzf ${archivePath} -C ${destDir}`, { timeout: 120000 });
}

async function downloadAndExtract(version, platform) {
  const binaryDir = getCacheDir(version);
  const binaryPath = getBinaryPath(version);
  const url = getReleaseUrl(version, platform);

  console.log(`[cykani-stealth] Downloading v${version} for ${platform}...`);

  const tmpPath = join(dirname(binaryDir), `_download_${Date.now()}.tar.gz`);

  try {
    await downloadFile(url, tmpPath);
    console.log(`[cykani-stealth] Extracting to ${binaryDir}`);
    await extractTar(tmpPath, binaryDir);

    if (!existsSync(binaryPath)) {
      throw new Error(`Binary not found after extraction at ${binaryPath}`);
    }

    console.log(`[cykani-stealth] Binary ready: ${binaryPath}`);
  } finally {
    if (existsSync(tmpPath)) {
      rmSync(tmpPath);
    }
  }
}

export async function ensureBinary() {
  // Check env override first
  if (process.env.CYKANI_BINARY_PATH) {
    if (!existsSync(process.env.CYKANI_BINARY_PATH)) {
      throw new Error(
        `CYKANI_BINARY_PATH='${process.env.CYKANI_BINARY_PATH}' but file does not exist`
      );
    }
    console.log(`[cykani-stealth] Using binary: ${process.env.CYKANI_BINARY_PATH}`);
    return process.env.CYKANI_BINARY_PATH;
  }

  const version = getVersion();
  const binaryPath = getBinaryPath(version);
  if (existsSync(binaryPath)) {
    return binaryPath;
  }

  const platform = getPlatform();
  await downloadAndExtract(version, platform);
  return binaryPath;
}

export function clearCache() {
  const cacheDir = getCacheDir();
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
    console.log(`[cykani-stealth] Cache cleared: ${cacheDir}`);
  }
}

export function binaryInfo() {
  const version = getVersion();
  return {
    version,
    platform: getPlatform(),
    binaryPath: getBinaryPath(version),
    cacheDir: getCacheDir(version),
    envPath: process.env.CYKANI_BINARY_PATH,
  };
}

export async function install() {
  const version = getVersion();
  const platform = getPlatform();
  const binaryPath = getBinaryPath(version);

  if (existsSync(binaryPath)) {
    console.log(`[cykani-stealth] Binary already installed: ${binaryPath}`);
    return binaryPath;
  }

  await downloadAndExtract(version, platform);
  return binaryPath;
}

const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // once per day
const _updateChecked = { value: false };

export function checkForUpdates(opts = {}) {
  if (typeof opts.checkNow === 'function') opts.checkNow = opts.checkNow;
  const doCheck = () => _checkForUpdatesImpl().catch(() => {});
  if (opts.sync) return _checkForUpdatesImpl();
  if (!_updateChecked.value) {
    _updateChecked.value = true;
    setTimeout(doCheck, opts.delay ?? 3000);
  }
}

async function _getLatestReleaseTag() {
  const url = `https://api.github.com/repos/${GITHUB_ORG}/${REPO}/releases/latest`;
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`GitHub API: HTTP ${response.status}`);
  const data = await response.json();
  return data.tag_name;
}

function _parseVersion(tag) {
  const m = tag.match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

function _compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

async function _checkForUpdatesImpl() {
  try {
    const tag = await _getLatestReleaseTag();
    const latest = _parseVersion(tag);
    const current = getVersion();
    if (latest && _compareVersions(latest, current) > 0) {
      console.log(`[cykani-stealth] Update available: v${current} → v${latest} (${tag})`);
      return { current, latest, updateAvailable: true };
    }
    return { current, latest, updateAvailable: false };
  } catch {
    return { current: getVersion(), latest: null, updateAvailable: false };
  }
}

// Auto-check on load (non-blocking)
setTimeout(() => _checkForUpdatesImpl().catch(() => {}), 5000);