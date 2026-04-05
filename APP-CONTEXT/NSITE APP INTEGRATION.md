# Nsite App Integration Plan

## 1) Nsite Deployment Integration (nsyte)

- Integrate deployment workflow for static Nuxt output using `nsyte`.
- Add project-level nsite configuration (`.nsite/config.json`) for root-site deployment.
- Add repeatable scripts and docs for:
  - building static output
  - deploying `.output/public`
  - checking deployment health and propagation
- Ensure SPA fallback handling is compatible with nsite hosting behavior.

## 2) Dedicated Deployment Keypair + Verification

- Generate a fresh, dedicated nostr keypair for deployment identity.
- Use that key to deploy the static site with `nsyte`.
- Verify deployment success with:
  - manifest visibility on relays
  - blossom object availability
  - successful hostname access from npub-based domain
- Record deploy/verification steps and outputs in a concise verification note.

## 3) Clone UX (Explanation First)

- Add a large shiny purple floating button at bottom-right.
- Button click opens an explanatory popup before any signer action:
  - explain that Nostr apps can be easily deployed by users themselves
  - explain that cloning to their npub will show their own products
- Include CTA button text exactly:
  - `Clone this Nsite to my own Npub !`
- Only after explicit confirmation should browser extension/signer flow be triggered.

## 4) Sandwich Clone Functionality Integration

- Integrate `@nsite/stealthis` for the clone/deploy behavior.
- Use manual placement with `<steal-this>` so explanation-first modal controls the flow.
- Style trigger using `::part(trigger)` to achieve the purply shiny visual language.
- Preserve compatibility with resolved npub host flow and existing product loading.

## 5) Regression and Compatibility Checks

- Confirm existing nsite hostname npub parsing still works.
- Confirm product list resolves from the expected merchant npub after clone flow.
- Rebuild and verify app remains stable across:
  - index products page
  - product details route
  - cart/checkout and invoice screens

## 6) Documentation Update

- Add this Nsite phase to the main implementation documentation.
- Include short operator notes for deploy credentials and security expectations.

---

## Execution Notes (Completed)

- Local nsyte binary installed at `tools/nsyte` (v0.24.1).
- Root-site deployment completed with generated deploy identity:
  - `npub1x8q6jcdpkmxmsj6zne3mg0l35azenr550ajvcj96tqv5fdz2q06q255lh9`
- Manifest event published and accepted on:
  - `wss://relay.ditto.pub`
  - `wss://relay.damus.io`
  - `wss://relay.primal.net`
  - `wss://nos.lol`
- Live gateway verification succeeded at:
  - `https://npub1x8q6jcdpkmxmsj6zne3mg0l35azenr550ajvcj96tqv5fdz2q06q255lh9.nsite.lol/`
