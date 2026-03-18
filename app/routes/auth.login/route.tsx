import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  // If we're inside the embedded app (shop param present), redirect to /app
  // instead of showing the login form — the app shell handles auth via session tokens.
  if (shop) {
    throw redirect(`/app?shop=${encodeURIComponent(shop)}`);
  }

  // If the request is inside an iframe (embedded), also redirect.
  // This prevents the bare login form from appearing inside Shopify admin.
  if (url.searchParams.get("embedded") === "1") {
    throw redirect("/app");
  }

  // Check for Shopify's sec-fetch headers — if the request comes from an iframe
  // context (embedded app) but without a shop param, redirect to /app so the
  // Shopify App Bridge can handle re-authentication automatically.
  const secFetchDest = request.headers.get("sec-fetch-dest");
  if (secFetchDest === "iframe") {
    throw redirect("/app");
  }

  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <s-page>
        <Form method="post">
        <s-section heading="Log in">
          <s-text-field
            name="shop"
            label="Shop domain"
            details="example.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.currentTarget.value)}
            autocomplete="on"
            error={errors.shop}
          ></s-text-field>
          <s-button type="submit">Log in</s-button>
        </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}
