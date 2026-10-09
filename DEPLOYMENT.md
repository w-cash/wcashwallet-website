# Deployment requirements

The website host and every public host alias must redirect HTTP before serving any wallet HTML or static asset.

## Required redirect behavior

- `http://wcashwallet.com/<path>?<query>` must return `301` or `308` with `Location: https://wcashwallet.com/<path>?<query>`.
- `http://www.wcashwallet.com/<path>?<query>` must return `301` or `308` with `Location: https://wcashwallet.com/<path>?<query>`.
- The redirect must preserve the complete path and query. It must happen at the CDN, load balancer, or origin boundary before the static site is read.
- An HTTP response must never contain Wcash Wallet HTML. A client-side redirect, canonical tag, or Content Security Policy upgrade directive does not meet this requirement.
- Any additional host alias must be inventoried and given the same permanent exact-path redirect before it becomes public.

As checked on 9 October 2026, both HTTP and HTTPS responses identify Cloudflare as the serving edge, while HTTP still returns `200` wallet HTML. The repository cannot change an account-level Cloudflare rule. The Cloudflare zone owner must create a Single Redirect before the origin/static site with all of these settings:

- Match hostname `wcashwallet.com` or `www.wcashwallet.com` when the request scheme is `http`.
- Redirect to `https://wcashwallet.com` plus the unchanged request path.
- Preserve the original query string.
- Use status `308` (or `301` if that is the established zone convention).

The infrastructure owner must implement and review this rule in the actual serving layer. Do not rely on Automatic HTTPS Rewrites, which changes embedded URLs rather than the HTTP response. Do not enable HSTS until HTTPS and redirects are verified for every covered host. Do not enable `includeSubDomains` or preload without a complete domain inventory and owner approval.

## Verification

Run the live deployment check after every routing or hosting change:

```sh
REDIRECT_MAPPINGS='http://wcashwallet.com=https://wcashwallet.com http://www.wcashwallet.com=https://wcashwallet.com' \
  npm run test:deployment
```

The check requests `/`, `/index.html`, and a nested path with a query. It fails unless each response is a permanent redirect to the exact HTTPS path and query, and it also fails if the HTTP response contains wallet HTML. The `Site checks` workflow exposes the same check as a manually triggered deployment gate.

Static publication must record the deployed source commit and deployment time in the hosting system, require review for production, and retain a tested rollback target.
