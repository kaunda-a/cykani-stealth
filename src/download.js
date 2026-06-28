// Binary manager — auto-download, cache, and version-pin the cykani-browser binary
// Mirrors CloakBrowser's download.ts architecture
//
// Distribution modes:
// 1. CYKANI_BINARY_PATH=/path/to/chrome - use local binary
// 2. CYKANI_DOWNLOAD_URL=https://... - private/self-hosted endpoint
// 3. Automatic download from releases (requires public repo)

import { existsSync, mkdirSync, rmSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { createWriteStream, renameSync } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';

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

function getCacheDir(version) {
  const v = version || getVersion();
  return process.env.CYKANI_STEALTH_CACHE || join(CACHE_DIR, `chromium-v${v}`);
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

function getDownloadUrl(version, platform) {
  const base = process.env.CYKANI_DOWNLOAD_URL || 'https://github.com/kaunda-a/cykani-browser/releases/download';
  const archive = `cykani-chrome-chromium-v${version}-${platform}.tar.gz`;
  return `${base}/chromium-v${version}/${archive}`;
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
  mkdirSync(destDir, { recursive: true });
  if (existsSync(destDir)) {
    rmSync(destDir, { recursive: true, force: true });
  }
  execSync(`tar -xzf ${archivePath} -C ${destDir}`, { timeout: 120000 });
}

async function downloadAndExtract(version, platform) {
  const binaryDir = getCacheDir(version);
  const binaryPath = getBinaryPath(version);
  const url = getDownloadUrl(version, platform);

  console.log(`[cykani-stealth] Downloading v${version} for ${platform}...`);
  console.log(`[cykani-stealth] URL: ${url}`);

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

export function binaryInfo(browserVersion) {
  const version = browserVersion || getVersion();
  return {
    version,
    platform: getPlatform(),
    binaryPath: getBinaryPath(version),
    cacheDir: getCacheDir(version),
    envPath: process.env.CYKANI_BINARY_PATH,
    downloadUrl: process.env.CYKANI_DOWNLOAD_URL || '(default GitHub)',
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

export async function update() {
  const repo = process.env.CYKANI_DOWNLOAD_URL
    ? null
    : 'https://api.github.com/repos/kaunda-a/cykani-browser/releases';

  if (!repo) {
    console.log('[cykani-stealth] Update check disabled with CYKANI_DOWNLOAD_URL');
    return null;
  }

  try {
    const resp = await fetch(repo, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) {
      console.log('[cykani-stealth] Could not check for updates');
      return null;
    }
    const releases = await resp.json();
    const platformTarball = `cykani-chrome-chromium-v1.0.0-${getPlatform()}.tar.gz`;
    for (const rel of releases) {
      if (rel.tag_name?.startsWith('chromium-v') && !rel.draft) {
        const assets = new Set((rel.assets || []).map(a => a.name));
        if (assets.has(platformTarball)) {
          const latest = rel.tag_name.replace('chromium-v', '');
          const latestPath = getBinaryPath(latest);
          if (!existsSync(latestPath)) {
            console.log(`[cykani-stealth] Updating to v${latest}...`);
            await downloadAndExtract(latest, getPlatform());
          }
          return latest;
        }
      }
    }
  } catch (e) {
    console.log('[cykani-stealth] Update check failed:', e.message);
  }
  return null;
}