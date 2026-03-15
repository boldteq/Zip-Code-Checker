Review the most recent changes in the Zip Code Checker Shopify app.

## What to Check

### Critical Issues (Report Every One)
1. **Auth missing** — any `app.*` route without `authenticate.admin(request)` at the top of loader/action
2. **Cross-shop data leak** — any DB query missing `where: { shop: session.shop }`
3. **Shopify API in components** — any GraphQL/REST calls outside loader/action functions
4. **Polaris violations** — raw `<div>`, `<p>`, `<h1>` etc. used instead of Polaris layout components
5. **TypeScript `any`** — any explicit `any` type or type assertion that loses safety
6. **Missing error handling** — async operations in actions without try/catch
7. **Missing loading states** — forms that submit without showing loading feedback

### Quality Issues (Report if Significant)
- Prisma queries without shop scoping
- Missing Toast for user feedback after mutations
- Hardcoded shop names or test data
- Webhook handlers that don't return 200 on error
- Missing idempotency checks in webhook handlers
- Public API routes (`api.*`) that accidentally use admin auth

### Billing/Subscription
- Any feature gate that should check the subscription plan but doesn't
- Billing API calls outside of `billing.server.ts`

## Format
- Be concise — only report real problems
- Group by severity: Critical → Quality → Billing
- For each issue: file path + line reference + what's wrong + how to fix
- Skip minor style issues (whitespace, naming preferences)
- If no issues found, say "No issues found" — don't invent problems

## Files to Check
Focus on recently modified files. Also spot-check:
- Any new `app.*.tsx` routes
- Any new `api.*.tsx` routes
- Any changes to `prisma/schema.prisma`
- Any changes to `billing.server.ts` or `plans.ts`
