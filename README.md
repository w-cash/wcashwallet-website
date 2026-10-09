# Wcash Wallet website

The production static website for [wcashwallet.com](https://wcashwallet.com/).

The site is self-contained: it loads no analytics, third-party scripts, remote fonts, wallet APIs, or blockchain endpoints. The interactive wallet is an in-browser simulation with sample data and no network connection.

There is no supported consumer wallet release. The site labels the current Android and desktop artifacts as unsupported developer previews and presents network, version, architecture, signing, installation, source, checksum, and support facts before the secondary candidate link. It does not offer the unsigned iOS compile archive as an install download; TestFlight is unavailable, and developers are directed to source build instructions.

Candidate evidence comes from the official [`w-cash/wallet-mobile`](https://github.com/w-cash/wallet-mobile) and [`w-cash/wallet-desktop`](https://github.com/w-cash/wallet-desktop) prereleases. Checksums detect download corruption, but do not authenticate the publisher without a signed trust root.

The mining-payout guide links the wallet to [ZecWec Pool](https://pool.zecwec.com/) and names the accepted WEC destination: a Wcash Mainnet Unified Address with an Ironwood receiver. It keeps wallet recovery material separate from pool and miner credentials and preserves the developer-preview warning before the onboarding steps.

Serve this directory as the web root. All public assets use root-relative URLs.

## Checks

Node.js 20 or newer is required. The checks have no third-party dependencies.

```sh
npm test
```

Production routing must permanently redirect HTTP to the exact HTTPS path before serving site content. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the infrastructure requirement and live deployment check.
