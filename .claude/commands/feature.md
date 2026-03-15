Build a complete feature for the Zip Code Checker Shopify app: $ARGUMENTS

## Your Process (Follow Exactly)

### Step 1 — Read the Rules
Read CLAUDE.md at the project root. Understand the stack: React Router 7, Polaris v13, Prisma, `@shopify/shopify-app-react-router`.

### Step 2 — Understand Existing Patterns
Read at least 2 of these files to match the exact code patterns:
- `app/routes/app.zip-codes.tsx` — CRUD list with modal
- `app/routes/app.delivery-rules.tsx` — complex form with rules
- `app/routes/app.settings.tsx` — settings form
- `app/routes/app.widget.tsx` — configuration form with live preview
- `app/routes/app.pricing.tsx` — billing/plan UI

### Step 3 — Identify the Route Type
- Admin page → `app/routes/app.[name].tsx` (requires `authenticate.admin`)
- Public API → `app/routes/api.[name].tsx` (returns JSON, no auth)
- Webhook → `app/routes/webhooks.[topic].tsx` (idempotent, return 200)

### Step 4 — Build the Route File
Structure every admin route exactly like:
```tsx
import { json } from "@shopify/shopify-app-react-router";
import { useLoaderData, useActionData, useNavigation, Form } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
// Polaris imports...

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  // fetch data from db using session.shop
  return json({ ... });
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  // handle form mutations
  // try/catch with proper error returns
  return json({ success: true } | { error: "message" });
}

export default function FeaturePage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";
  // Polaris UI only
}
```

### Step 5 — Database Operations
- Import: `import db from "~/db.server";`
- Always filter by `session.shop` — never fetch cross-shop data
- Use `upsert` for singleton records (like WidgetConfig, Subscription)
- Use `findMany` + `where: { shop: session.shop }` for lists

### Step 6 — Polaris UI Requirements
- Wrap page in `<Page title="...">` with `<Layout>` inside
- Add `<Toast>` for success/error feedback (use `active` state)
- Add `<SkeletonPage>` for loading states
- Forms use `<Form method="post">` with Polaris `<FormLayout>`
- Tables use `<DataTable>` or `<IndexTable>`

### Step 7 — TypeScript & Quality
- Run `npm run typecheck` after building
- Fix EVERY TypeScript error — zero tolerance
- No `any` types — infer from Prisma types or define explicit interfaces

### Step 8 — Report
List:
1. Files created/modified
2. Database changes (if any migration needed)
3. Exact steps to test the feature
4. Any environment variables needed
