# Gamma Market Webshop Implementation Plan

## 1) Identity + Relay Resolution Layer

- Add `public/shop-config.json` for local testing, defaulting merchant to:
  - `npub1equrmqway3qxw3dkssymusxkwgwrqypfgeqx0lx9pgjam7gnj4ysaqhkj6`
- In production, resolve merchant npub from Nsite hostname format:
  - `https://npubs1...domain.com`
- Use only these relays for initial discovery:
  - `wss://relay.ditto.pub`
  - `wss://relay.damus.io`
  - `wss://relay.primal.net`
- Fetch relay metadata (`kind:10002`) and then switch to inbox/outbox relay sets for all operational traffic:
  - catalog fetch
  - order publish
  - payment-response listening
- Build a relay resolver composable so there are no hardcoded operational fallback relays.

## 2) Marketplace Data + Cart State

- Add a product composable for Gamma/NIP-99 marketplace events:
  - products from `kind:30402`
  - optional shipping options from `kind:30406`
  - parse tags such as `d`, `title`, `price`, `image`, `summary`, `stock`, `visibility`, `shipping_option`
- Add Pinia cart/checkout store with:
  - cart items and quantities
  - shipping/contact form state
  - selected shipping option
  - order totals and order id
  - payment request/invoice state
  - persistence to localStorage
- Normalize product references to `30402:<pubkey>:<d-tag>` for order creation compatibility.

## 3) Routes + UX Flow

- `pages/index.vue`: minimal polished product grid with price, stock/visibility handling, and add-to-cart.
- `pages/product/[d].vue`: individual product page with media/specs/description/shipping and quantity add.
- `pages/cart.vue`: 4-step checkout wizard:
  1. shipping/contact input
  2. order + totals overview
  3. submit order
  4. show Lightning invoice QR + payment instructions/status

## 4) Guest Checkout (Keypair Generation + User Delivery)

- Add guest mode in checkout (no extension required):
  - generate a fresh keypair (`nsec`/`npub`) using `nostr-tools`
  - use it to sign order events
- Persist guest keys locally for session continuity until payment/order completion.
- Show a dedicated guest key backup panel after generation and again after submit:
  - display `npub` and `nsec`
  - provide copy buttons
  - warn that `nsec` is sensitive and required for recovery of order communication history
- Require explicit user acknowledgment before submitting the order.

## 5) Gamma-Compatible Order + Payment Request Handling

- On step 3, build and publish order event (`kind:16`, `type:1`) with required tags:
  - `p`, `subject`, `type`, `order`, `amount`, repeated `item`
  - optional `shipping`, `address`, `email`, `phone`
  - notes in `content`
- Publish via buyer outbox relays and address merchant pubkey.
- Subscribe on buyer inbox relays for merchant payment request (`kind:16`, `type:2`) matching `order`.
- Extract Lightning payment tag (`["payment","lightning","<bolt11>"]`), move to step 4, render invoice QR, and show amount/expiration.

## 6) Validation + Hardening

- Handle missing merchant relay metadata with clear UX errors and retry path.
- Validate malformed marketplace tags and skip invalid items safely.
- Prevent duplicate submissions with idempotent submit guarding by order id.
- Run `npm run generate` and perform manual flow checks for:
  - local config mode
  - Nsite hostname mode
  - guest checkout end-to-end

## 7) Route Stability Fixes (Implemented)

- Product `d` tags may include URL-unsafe characters; product links now use URL encoding.
- Product detail route now safely decodes the route param before querying `kind:30402` by `#d`.
- This prevents broken item pages caused by raw `d` tags containing characters like spaces, slashes, or symbols.

## 8) Fiat-to-Bitcoin Conversion (Implemented)

- Checkout now supports products priced in fiat currencies (for example `USD`, `EUR`) in addition to `SATS` and `BTC`.
- Added a conversion layer using a fiat-to-bitcoin API (`CoinGecko simple price`) to resolve sats totals at checkout.
- Cart and checkout totals are now computed in sats using live conversion rates when needed.
- The checkout UI shows conversion loading/error states and blocks submission if a required conversion rate is unavailable.

## 9) Invoice QR Delivery Reliability (Implemented)

- Expanded payment request lookup to include merchant-authored events and broader `kind:16` replies addressed to the buyer (`#p`), then filter by `type=2` and order id.
- Polling now performs an immediate first check (not only delayed interval checks), reducing time-to-QR for fast merchant responses.
- Added fallback invoice path via merchant `lud16` (resolved from kind `0` metadata), requesting a BOLT11 invoice over LNURL-pay when no `type:2` message arrives.
- Step 4 now includes an explicit "Request invoice via merchant lud16" action and clear fallback error/loading states.

## 10) Merchant-Branded Header (Implemented)

- Replaced the static "Gamma Market Shop" title with merchant profile branding loaded from kind `0` metadata.
- Header now shows the merchant's rounded profile image and display name (`display_name`/`name`) across catalog, product, and cart pages.
- Added graceful fallback rendering (`Merchant Shop` + placeholder avatar) when profile metadata is missing.

## 11) Dark/Light Theme Toggle (Implemented)

- Added a global theme mode system with persisted preference (`localStorage`) and a header toggle.
- Default theme is now `dark` on first load.
- Added `light` theme override via `html[data-theme="light"]` CSS variables while keeping shared component structure.
- Toggle label updates contextually (`Light mode` when dark is active, `Dark mode` when light is active).
