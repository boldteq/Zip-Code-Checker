# Zip Code Checker — Changelog

## Unreleased

### Added
- GDPR mandatory webhooks: `customers/data_request`, `customers/redact`, `shop/redact`
- Public API endpoint `GET /api/zip-check` for storefront widget zip code lookup
- CORS headers on public API for cross-origin storefront requests

### Changed
- Removed unused OAuth scopes (`write_products`, `write_metaobject_definitions`, `write_metaobjects`)
- Removed template demo metafield and example metaobject definitions from `shopify.app.toml`
- Moved `@prisma/client` from `devDependencies` to `dependencies` (required at runtime)
- Aligned Shopify API version to `2026-01` across `shopify.server.ts` and `shopify.app.toml`
- Updated `.gitignore` to correctly exclude `prisma/dev.db`

### Removed
- `app/routes/app.additional.tsx` — template boilerplate page (not linked in navigation)
- `@shopify/plugin-cloudflare` from `trustedDependencies` (not applicable to this Node.js app)

## 1.0.0 — Initial Release

- Zip code management (allowed/blocked, activate/deactivate, zones, ETAs)
- Delivery rules (fees, min order, cutoff times, day-of-week schedules)
- Customer waitlist with bulk notify
- Storefront widget customisation (colours, text, position, custom CSS)
- Dashboard with usage stats and quick actions
- Multi-tier billing: Free / Pro ($12.99/mo or $99/yr) / Ultimate ($24.99/mo or $199/yr)
- Shopify App Subscriptions billing with 14-day trial
- Webhook handling: `app/uninstalled`, `app/scopes_update`, `app_subscriptions/update`
- Public landing page with install form
