Handle this database task for the Zip Code Checker Shopify app: $ARGUMENTS

## Database Context

**ORM:** Prisma v6
**Dev DB:** SQLite (`prisma/dev.db`)
**Prod DB:** PostgreSQL (via `DATABASE_URL` env var)
**Client:** Singleton in `app/db.server.ts`

## Models Reference
- **ZipCode** — `id, shop, zipCode, label, zone, message, eta, type, createdAt, updatedAt` | unique: `[shop, zipCode]`
- **DeliveryRule** — `id, shop, name, zone, zipCodes, minOrderAmount, deliveryFee, freeShippingAbove, estimatedDays, cutoffTime, daysOfWeek, priority, createdAt, updatedAt`
- **WaitlistEntry** — `id, shop, email, zipCode, note, status, createdAt, updatedAt` | unique: `[shop, email, zipCode]`
- **WidgetConfig** — `id, shop, position, primaryColor, successColor, errorColor, backgroundColor, textColor, heading, placeholder, buttonText, ...` | unique: `shop`
- **Subscription** — `id, shop, planId, billingInterval, shopifySubscriptionId, status, trialEndsAt, createdAt, updatedAt` | unique: `shop`
- **Session** — Shopify session storage (DO NOT modify)

## Process

### For Schema Changes
1. Read `prisma/schema.prisma` first
2. Plan the change — add fields, new model, or index
3. Edit `prisma/schema.prisma`
4. Run `npx prisma migrate dev --name [descriptive_name]`
5. Update any TypeScript types that reference changed models
6. Run `npm run typecheck`

### For Query Issues
1. Always include `where: { shop: session.shop }` for security
2. Use `upsert` for singleton records (WidgetConfig, Subscription)
3. Use `create` / `update` / `delete` for multi-record models
4. Use transactions for multi-step operations: `db.$transaction([...])`

### For Seeding / Test Data
1. Only add seed data in dev environment
2. Use `prisma/seed.ts` if it exists
3. Never hardcode real shop domains

### Caution Rules
- NEVER run `npx prisma migrate reset` without explicit user confirmation — it deletes all data
- NEVER modify `Session` model — it's managed by `@shopify/shopify-app-session-storage-prisma`
- Always check existing migrations before creating new ones
