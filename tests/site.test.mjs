import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const [html, script] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8')
]);

test('publishes complete indexable homepage metadata with one server-rendered heading', () => {
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/wcashwallet\.com\/">/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta name="twitter:title"/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /"@type":"SoftwareApplication"/);
  assert.match(html, /"@type":"WebPage"/);
});

test('authorizes the current JSON-LD with the inline CSP hash', () => {
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(jsonLd);
  const hash = createHash('sha256').update(jsonLd).digest('base64');
  assert.match(html, new RegExp(`script-src[^\"]+'sha256-${hash.replace(/[+]/g, '\\+')}'`));
});

test('makes the educational demo and unsupported release state prominent', () => {
  assert.match(html, /EDUCATIONAL SAMPLE \/ 01/);
  assert.match(html, /NO REAL FUNDS · NO NETWORK/);
  assert.match(html, /No supported consumer release is available/);
  assert.match(html, /Developer preview — unsupported/);
  assert.doesNotMatch(html, />Get the wallet</i);
  assert.doesNotMatch(html, /Five platforms/i);
});

test('removes the unsigned iOS archive from the download flow', () => {
  assert.doesNotMatch(html + script, /ios-arm64-device-compile-unsigned\.zip/);
  assert.match(script, /TestFlight is not available/);
  assert.match(script, /docs\/ios_developer_quickstart\.md/);
  assert.match(script, /no iOS download is offered/i);
});

test('shows release facts and exact evidence links before candidate actions', () => {
  const factsPosition = html.indexOf('class="release-facts"');
  const actionPosition = html.indexOf('id="platform-download"');
  assert.ok(factsPosition > -1 && actionPosition > factsPosition);

  for (const label of ['Network', 'Version', 'Architecture', 'Signing', 'Install method', 'Source commit', 'SHA-256', 'Support']) {
    assert.match(html, new RegExp(`<dt>${label.replace('-', '\\-')}</dt>`));
  }

  for (const evidence of ['platform-source', 'platform-release', 'platform-manifest', 'platform-checksums']) {
    assert.match(html, new RegExp(`id="${evidence}"`));
  }

  for (const repository of ['w-cash/wallet-mobile', 'w-cash/wallet-desktop']) {
    assert.match(html + script, new RegExp(`https://github\\.com/${repository}`));
  }
});

test('pins every offered artifact to the published source and checksum', () => {
  const expected = [
    'f136a09d7b4959ee800dcef6d4cb9a0b4b39b1da',
    'ad41c67ed080d9a394bb80dacd653c195678144db261732fa967ab93d1b2fcc4',
    '6687e56a30d5477f6e70375fda0666f966cd6118',
    'cba78d82161afbe6b1748184a627b0a20e4bbd52ddfd65195780dc4cdd2df8e0',
    'd9bb27dff359de5da58070a73c563b583592aac388b9b3715eb5bc637b5161b0',
    'da2ee38b49933c6b1595478793da51d78e9e23991556dc85f39ebca740c2e405'
  ];
  for (const value of expected) assert.match(html + script, new RegExp(value));
});
