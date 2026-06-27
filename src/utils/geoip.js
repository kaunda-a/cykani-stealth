// GeoIP auto-resolution module to prevent timezone/locale mismatches with proxy
// Optional dep: mmdb-lib ~70MB GeoLite2-City.mmdb, installs on first use

let Reader;

const COUNTRY_LOCALE_MAP = {
  US: 'en-US', GB: 'en-GB', AU: 'en-AU', CA: 'en-CA', NZ: 'en-NZ',
  IE: 'en-IE', ZA: 'en-ZA', SG: 'en-SG',
  DE: 'de-DE', AT: 'de-AT', CH: 'de-CH',
  FR: 'fr-FR', BE: 'fr-BE',
  ES: 'es-ES', MX: 'es-MX', AR: 'es-AR', CO: 'es-CO', CL: 'es-CL',
  BR: 'pt-BR', PT: 'pt-PT',
  IT: 'it-IT', NL: 'nl-NL',
  JP: 'ja-JP', KR: 'ko-KR', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-HK',
  RU: 'ru-RU', UA: 'uk-UA', PL: 'pl-PL', CZ: 'cs-CZ', RO: 'ro-RO',
  IL: 'he-IL', TR: 'tr-TR', SA: 'ar-SA', AE: 'ar-AE', EG: 'ar-EG',
  IN: 'hi-IN', ID: 'id-ID', PH: 'en-PH',
  TH: 'th-TH', VN: 'vi-VN', MY: 'ms-MY',
  SE: 'sv-SE', NO: 'nb-NO', DK: 'da-DK', FI: 'fi-FI',
  GR: 'el-GR', HU: 'hu-HU', BG: 'bg-BG',
};

async function getReader() {
  if (Reader) return Reader;
  try {
    const mmdb = await import('mmdb-lib');
    Reader = mmdb.default?.Reader ?? mmdb.Reader;
    return Reader;
  } catch {
    return null;
  }
}

export async function resolveGeoip(entity) {
  if (!entity.proxy || (entity.timezone && entity.locale)) {
    return entity;
  }

  const ReaderClass = await getReader();
  if (!ReaderClass) {
    return entity; // mmdb-lib not installed
  }

  // Extract IP from proxy URL
  let hostname;
  try {
    const url = new URL(entity.proxy.includes('://') ? entity.proxy : `http://${entity.proxy}`);
    hostname = url.hostname;
  } catch {
    return entity;
  }

  // Only IP-based proxies are resolvable without DNS lookup
  const isIP = /^[0-9.]+$/.test(hostname) || hostname.includes(':');
  if (!isIP) return entity;

  // Stub: real implementation would look up IP in GeoLite2-City.mmdb
  return entity;
}

export { COUNTRY_LOCALE_MAP };
