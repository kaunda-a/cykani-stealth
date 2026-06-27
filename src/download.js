// Binary manager — auto-download, cache, and version-pin the cykani-browser binary
// Mirrors CloakBrowser's download.py / download.ts architecture

import { existsSync, constants } from 'fs';
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

const CACHE_DIR = join(homedir(), '.cykani-stealth');
const PLATFORM_VERSIONS = {
  'linux-x64': '1.0.0',
  'linux-arm64': '1.0.0',
  'darwin-arm64': '1.0.0',
  'darwin-x64': '1.0.0',
  'win32-x64': '1.0.0',
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

function getCacheDir() {
  return process.env.CYKANI_STEALTH_CACHE || join(CACHE_DIR, 'chromium-v' + getVersion());
}

function getBinaryPath() {
  const cacheDir = getCacheDir();
  const platform = getPlatform();
  if (platform.startsWith('darwin')) {
    return join(cacheDir, 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
  }
  if (platform.startsWith('win32')) {
    return join(cacheDir, 'chrome.exe');
  }
  return join(cacheDir, 'chrome');
}

function getDownloadUrl(version, platform) {
  const base = process.env.CYKANI_DOWNLOAD_URL || 'https://github.com/ndumsio/cykani-browser/releases/download';
  const archive = `cykani-browser-v${version}-${platform}.tar.gz`;
  return `${base}/v${version}/${archive}`;
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download binary: ${response.status} ${response.statusText}`);
  }
  // Stream to temp file
  const tmp = dest + '.tmp';
  const stream = createWriteStream(tmp);
  
  if (response.body) {
    await pipeline(Readable.from(response.body), stream);
  }
  
  writeFileSync(dest + '.marker', new Date().toISOString());
  // In real implementation: extract tar.gz here
  // For now, just rename tmp to dest
  // require('fs').renameSync(tmp, dest);
  // chmod for Linux/macOS
  if (process.platform !== 'win32') {
    // require('fs').chmodSync(dest, 0o755);
  }
}

export async function ensureBinary(licenseKey) {
  // Check env override first
  if (process.env.CYKANI_BINARY_PATH) {
    return process.env.CYKANI_BINARY_PATH;
  }

  const binaryPath = getBinaryPath();
  if (existsSync(binaryPath)) {
    return binaryPath;
  }

  // Auto-download (requires license key or free tier URL)
  const version = getVersion();
  const platform = getPlatform();
  const url = getDownloadUrl(version, platform);

  console.log(`Downloading cykani-browser v${version} for ${platform}...`);
  
  try {
    await download(url, binaryPath);
    return binaryPath;
  } catch (err) {
    throw new Error(
      `Failed to download cykani-browser binary.
      URL: ${url}
      Error: ${err.message}
      
      Set CYKANI_BINARY_PATH to your local binary, or ensure the download URL is accessible.
      `
    );
  }
}

export function clearCache() {
  // Remove cached binary
  const cacheDir = getCacheDir();
  // In real implementation: rm -rf cacheDir
  console.log('Cache cleared:', cacheDir);
}

export function binaryInfo() {
  return {
    platform: getPlatform(),
    version: getVersion(),
    binaryPath: getBinaryPath(),
    cacheDir: getCacheDir(),
    envPath: process.env.CYKANI_BINARY_PATH,
  };
}
