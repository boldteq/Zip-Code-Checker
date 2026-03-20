# Pinzo — Shopify App Project Brain

## Stack (Exact Versions)
- **Framework:** React Router 7 (`@shopify/shopify-app-react-router` v1) — NOT Remix
- **UI:** Shopify Polaris v13 (`@shopify/polaris`) — use ONLY Polaris components, never raw HTML for layout
- **App Bridge:** `@shopify/app-bridge-react` v4 — for all Shopify admin UI interactions
- **Auth:** `shopify.server.ts` → `authenticate.admin(request)` — required before every Shopify API call
- **Database:** Prisma v6 + SQLite (dev) / PostgreSQL (prod)
- **Language:** TypeScript everywhere — zero plain `.js` files allowed
- **Bundler:** Vite v6
- **Node:** ≥20.19

## Folder Structure
```
app/
  routes/           ← All file-based routes
  billing.server.ts ← Billing/subscription logic
  db.server.ts      ← Prisma client singleton
  plans.ts          ← Pricing plan definitions (Free/Pro/Ultimate)
  shopify.server.ts ← Shopify auth + API setup
  root.tsx          ← Root component
  entry.server.tsx  ← Server entry
prisma/
  schema.prisma     ← Database schema
  migrations/       ← Migration history
.claude/
  settings.json     ← Shared permissions config
  commands/         ← Slash commands (/feature, /fix, /review)
  agents/           ← Specialized agents (builder, bug-fixer)
```

## Database Models (Prisma)
- **Session** — Shopify OAuth session storage (do NOT modify)
- **ZipCode** — shop, zipCode, label, zone, message, eta, type (allowed/blocked)
- **DeliveryRule** — shop, name, zone, zipCodes, minOrderAmount, deliveryFee, freeShippingAbove, estimatedDays, cutoffTime, daysOfWeek, priority
- **WaitlistEntry** — shop, email, zipCode, note, status (waiting/notified/converted)
- **WidgetConfig** — shop, position, colors, heading, placeholder, buttonText, messages, borderRadius, customCss
- **Subscription** — shop, planId, billingInterval, shopifySubscriptionId, status, trialEndsAt

## Route Patterns
| Route Pattern | Purpose |
|---|---|
| `app._index.tsx` | Dashboard |
| `app.*.tsx` | Admin pages (require authenticate.admin) |
| `api.*.tsx` | Public API endpoints (storefront widget) |
| `webhooks.*.tsx` | Webhook handlers |
| `auth.*.tsx` | OAuth flow (do NOT modify) |

## Architecture Rules
1. **Auth first** — always call `authenticate.admin(request)` before any Shopify API usage
2. **Loaders/actions only** — Shopify API calls ONLY inside loaders and actions, never inside components
3. **Polaris only** — use ONLY Polaris v13 components for all UI inside `app.*` routes
4. **Public APIs** — `api.*` routes serve the storefront widget (no auth required, return JSON)
5. **Webhooks** — handle idempotently, return 200 quickly, no heavy processing inline
6. **DB access** — import `db` from `~/db.server` for all Prisma operations
7. **Billing** — use `billing.server.ts` for all subscription checks and plan changes
8. **Plans** — reference `plans.ts` for plan IDs and feature flags

## UI Rules (Polaris v13)
- Layout: `Page`, `Layout`, `Layout.Section`, `Card`, `BlockStack`, `InlineStack`
- Data: `DataTable`, `IndexTable`, `ResourceList`
- Forms: `Form`, `FormLayout`, `TextField`, `Select`, `Checkbox`
- Feedback: `Toast` for user-facing errors and success, `Banner` for persistent alerts
- Loading: `SkeletonPage`, `SkeletonBodyText`, `SkeletonDisplayText` — always add loading states
- Modals: `Modal` component with `active` prop
- Navigation: use App Bridge `useNavigate` for in-app navigation

## Code Rules
- Fix ALL TypeScript errors before marking anything done — run `npm run typecheck`
- Error handling on every async operation (try/catch in actions/loaders)
- Never use raw `fetch()` for Shopify API — use the graphql client from `authenticate.admin()`
- Before writing new code: read 2-3 existing similar route files and match their exact pattern
- No `any` types — use proper TypeScript types or infer from Prisma
- `useActionData`, `useLoaderData` for data in components — never fetch inside components

## Commands
```bash
npm run dev          # Start dev server via Shopify CLI
npm run build        # Build for production
npm run typecheck    # TypeScript validation (run after every change)
npm run lint         # ESLint check
npm run setup        # Prisma generate + migrate (first time)
npx prisma studio    # Visual DB browser
npx prisma migrate dev --name <name>   # Create new migration
npx shopify app deploy                  # Deploy to Shopify
```

## When Building a Feature — Always Follow This Order
1. Read CLAUDE.md (this file) — understand rules
2. Read 2-3 existing similar route files (e.g. `app.zip-codes.tsx`, `app.settings.tsx`)
3. Build the route file: `loader` (fetch data) + `action` (handle mutations) + default export component
4. Use only Polaris v13 for all UI
5. Add error handling in action with try/catch, return errors via `json()`
6. Add loading states with Polaris Skeleton components
7. Run `npm run typecheck` — fix every error before finishing
8. List all files created and what to test

## Existing Feature Reference
- ZIP code CRUD → `app/routes/app.zip-codes.tsx`
- Delivery rules → `app/routes/app.delivery-rules.tsx`
- Waitlist viewer → `app/routes/app.waitlist.tsx`
- Widget config → `app/routes/app.widget.tsx`
- Billing/pricing → `app/routes/app.pricing.tsx` + `app/billing.server.ts`
- Settings → `app/routes/app.settings.tsx`
- Public ZIP API → `app/routes/api.zip-check.tsx`
- Public widget config API → `app/routes/api.widget-config.tsx`
- Waitlist signup API → `app/routes/api.waitlist.tsx`
