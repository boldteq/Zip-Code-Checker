# Zip Code Checker — Shopify App

A Shopify embedded app that lets merchants control delivery availability by zip code. Built with React Router 7, Shopify Polaris, and Prisma.

## Features

- **Zip Code Management** — Add, edit, activate/deactivate allowed and blocked zip codes
- **Delivery Zones & ETAs** — Group zip codes into zones with estimated delivery times
- **Delivery Rules** — Zone-based rules for fees, minimum order amounts, cutoff times, and schedules
- **Customer Waitlist** — Capture emails from unsupported areas and notify when coverage expands
- **Widget Customisation** — Style the storefront zip code checker widget without touching code
- **Billing** — Free, Pro, and Ultimate plans via Shopify App Subscriptions

## Tech Stack

- [React Router 7](https://reactrouter.com) (full-stack)
- [Shopify Polaris](https://polaris.shopify.com) v13
- [Shopify App React Router](https://github.com/Shopify/shopify-app-js)
- [Prisma](https://www.prisma.io) ORM (SQLite for dev, PostgreSQL for production)
- TypeScript, Vite

## Development

### Prerequisites

- Node.js ≥ 20.19
- A [Shopify Partner](https://partners.shopify.com) account and development store

### Setup

```bash
npm install
npm run setup        # prisma generate + migrate
npm run dev          # shopify app dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server via Shopify CLI |
| `npm run build` | Build for production |
| `npm run start` | Serve the built app |
| `npm run setup` | Generate Prisma client and run migrations |
| `npm run deploy` | Deploy to Shopify |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |

## Production Database

Switch from SQLite to PostgreSQL for production:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Run `npm run setup`

## Public API

The storefront widget calls a public endpoint to check zip code availability:

```
GET /api/zip-check?shop=store.myshopify.com&zip=12345
POST /api/zip-check  { "shop": "store.myshopify.com", "zip": "12345" }
```

Response:
```json
{ "allowed": true, "message": "We deliver to your area!", "eta": "2-3 days", "zone": "North" }
```

## GDPR Compliance

The app implements all three mandatory GDPR webhooks required by Shopify:

- `customers/data_request` — logs customer data requests for manual fulfilment
- `customers/redact` — deletes customer PII (waitlist entries)
- `shop/redact` — deletes all shop data 48 hours after uninstall

## Shopify App Store

This app is designed for submission to the Shopify App Store and follows all [Shopify app requirements](https://shopify.dev/docs/apps/launch/app-requirements).
