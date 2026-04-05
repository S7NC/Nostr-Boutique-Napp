# Nsite Deployment Verification

## Generated Deployment Identity (Test)

This keypair was generated for deployment verification in this session.

- `npub`: `npub1x8q6jcdpkmxmsj6zne3mg0l35azenr550ajvcj96tqv5fdz2q06q255lh9`
- `pubkey`: `31c1a961a1b6cdb84b429e63b43ff1a745998e947f64cc48ba581944b44a03f4`
- `nsec`: `[REDACTED - rotate and provide at runtime only]`

> Security note: rotate this key for production use and keep `nsec` private.

## Commands Run

```bash
npm run generate
./tools/nsyte deploy ./.output/public --sec <nsec> --fallback /index.html --verbose
./tools/nsyte status --sec <nsec>
```

## Deployment Outcome

- Site manifest event created:
  - `d77468776f2f2393d50bac88f2fb3227691e4e3d22a32675881477c8a6912125`
- Relay publish accepted on all configured relays:
  - `wss://relay.ditto.pub`
  - `wss://relay.damus.io`
  - `wss://relay.primal.net`
  - `wss://nos.lol`
- Blossom upload summary:
  - `https://blossom.primal.net` -> `29/29`
  - `https://cdn.satellite.earth` -> `0/29` (401), but deployment still valid due full availability on at least one server.

## Live URL Check

- Verified reachable gateway URL:
  - `https://npub1x8q6jcdpkmxmsj6zne3mg0l35azenr550ajvcj96tqv5fdz2q06q255lh9.nsite.lol/`

## Notes

- Nsite integration scripts are available in `package.json`:
  - `nsite:build`
  - `nsite:deploy`
  - `nsite:status`
  - `nsite:debug`
- Deployment config is stored at `.nsite/config.json`.
