Fix this issue in the Zip Code Checker Shopify app: $ARGUMENTS

## Debugging Process (Follow Exactly)

### Step 1 — Locate the Issue
- Find all files related to the error (route file, server file, Prisma schema)
- Read the full file where the error originates
- Check the exact error message and stack trace

### Step 2 — Check These Common Root Causes First

**Auth issues (70% of Shopify bugs):**
- Is `authenticate.admin(request)` called before every Shopify API usage?
- Is `session.shop` being used to scope DB queries?
- Is the route missing auth (public routes `api.*` should NOT use admin auth)

**TypeScript errors:**
- Run `npm run typecheck` to see all errors at once
- Check Prisma-generated types match usage
- Check React Router `useLoaderData<typeof loader>()` type inference

**Polaris component errors:**
- Check Polaris v13 prop names — many changed from v12
- `size` prop on Button is now `variant` in some cases
- Check `@shopify/polaris` TypeScript definitions in `node_modules/@shopify/polaris/build/ts/`

**Prisma/DB errors:**
- Check `db.server.ts` Prisma singleton
- Always filter with `where: { shop: session.shop }`
- Unique constraint: ZipCode has `@@unique([shop, zipCode])`

**Webhook errors:**
- Must return 200 status always
- Handle idempotently (check if record exists before creating)
- GDPR webhooks: `customers.data_request`, `customers.redact`, `shop.redact`

**Billing errors:**
- Use `billing.server.ts` — never directly call Billing API
- Check `plans.ts` for plan IDs and interval types

### Step 3 — Read Before Fixing
Always read the full file before editing. Understand surrounding code context. Match existing patterns exactly.

### Step 4 — Fix (Minimal, Targeted)
- Fix ONLY what is broken — never refactor working code while fixing a bug
- If fixing a TypeScript error, don't change logic
- If fixing a logic bug, don't change types
- Make the smallest change that fixes the issue

### Step 5 — Verify
- Run `npm run typecheck` — confirm zero new errors
- Confirm the fix does not break adjacent functionality
- For Prisma changes: check if migration is needed (`npx prisma migrate dev --name fix_[description]`)

### Step 6 — Report
Explain in 2-3 sentences:
1. What was the root cause
2. What was changed to fix it
3. Any follow-up actions needed (migration, env var, etc.)
