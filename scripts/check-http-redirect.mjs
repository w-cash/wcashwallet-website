const DEFAULT_PATHS = [
  '/',
  '/index.html',
  '/download/check?source=redirect-test'
];

const WALLET_HTML_MARKERS = /<title>\s*Wcash Wallet|id=["']wallet-demo["']|Wcash Wallet Developer Preview/i;

export async function assertHttpRedirect({ httpOrigin, httpsOrigin, paths = DEFAULT_PATHS, fetchImpl = fetch }) {
  const failures = [];

  for (const path of paths) {
    const source = new URL(path, httpOrigin);
    const expected = new URL(path, httpsOrigin);
    let response;

    try {
      response = await fetchImpl(source, { redirect: 'manual' });
    } catch (error) {
      failures.push(`${source}: request failed: ${error.message}`);
      continue;
    }

    const locationValue = response.headers.get('location');
    const location = locationValue ? new URL(locationValue, source) : null;
    const body = await response.text();

    if (![301, 308].includes(response.status)) {
      failures.push(`${source}: expected permanent 301 or 308, received ${response.status}`);
    }
    if (!location || location.href !== expected.href) {
      failures.push(`${source}: expected Location ${expected.href}, received ${locationValue ?? 'none'}`);
    }
    if (WALLET_HTML_MARKERS.test(body)) {
      failures.push(`${source}: HTTP response contained wallet HTML`);
    }
  }

  if (failures.length) {
    throw new Error(failures.join('\n'));
  }
}

function parseMapping(value) {
  const separator = value.indexOf('=');
  if (separator === -1) {
    throw new Error(`Invalid origin mapping "${value}". Use http://host=https://host.`);
  }
  const httpOrigin = value.slice(0, separator);
  const httpsOrigin = value.slice(separator + 1);
  if (!httpOrigin.startsWith('http://') || !httpsOrigin.startsWith('https://')) {
    throw new Error(`Invalid origin mapping "${value}". Source must be HTTP and target must be HTTPS.`);
  }
  return { httpOrigin, httpsOrigin };
}

async function main() {
  const mappings = (process.env.REDIRECT_MAPPINGS ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!mappings.length) {
    throw new Error(
      'Set REDIRECT_MAPPINGS to at least one origin mapping, for example http://wcashwallet.com=https://wcashwallet.com.'
    );
  }

  for (const value of mappings) {
    const mapping = parseMapping(value);
    await assertHttpRedirect(mapping);
    console.log(`Verified permanent exact-path HTTPS redirects for ${mapping.httpOrigin}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
