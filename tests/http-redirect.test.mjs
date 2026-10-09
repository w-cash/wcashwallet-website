import test from 'node:test';
import assert from 'node:assert/strict';
import { assertHttpRedirect } from '../scripts/check-http-redirect.mjs';

function response(status, location, body = '') {
  return new Response(body, {
    status,
    headers: location ? { location } : {}
  });
}

test('accepts permanent redirects that preserve the exact path and query', async () => {
  await assertHttpRedirect({
    httpOrigin: 'http://wcashwallet.com',
    httpsOrigin: 'https://wcashwallet.com',
    paths: ['/wallet/file?channel=preview'],
    fetchImpl: async request => response(308, `https://wcashwallet.com${request.pathname}${request.search}`)
  });
});

test('rejects temporary or path-changing redirects', async () => {
  await assert.rejects(
    assertHttpRedirect({
      httpOrigin: 'http://wcashwallet.com',
      httpsOrigin: 'https://wcashwallet.com',
      paths: ['/wallet/file?channel=preview'],
      fetchImpl: async () => response(302, 'https://wcashwallet.com/')
    }),
    /expected permanent 301 or 308[\s\S]*expected Location/
  );
});

test('rejects wallet HTML returned on the HTTP origin', async () => {
  await assert.rejects(
    assertHttpRedirect({
      httpOrigin: 'http://wcashwallet.com',
      httpsOrigin: 'https://wcashwallet.com',
      paths: ['/'],
      fetchImpl: async () => response(200, null, '<!doctype html><title>Wcash Wallet</title>')
    }),
    /HTTP response contained wallet HTML/
  );
});
