import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { syncSubscriptionFromShopify } from "../billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  try {
    type SubscriptionPayload = {
      app_subscription?: {
        admin_graphql_api_id?: string;
        name?: string;
        status?: string;
      };
    };

    const data = payload as SubscriptionPayload;
    const sub = data?.app_subscription;

    if (sub) {
      await syncSubscriptionFromShopify(shop, [
        {
          id: sub.admin_graphql_api_id ?? "",
          name: sub.name ?? "",
          status: sub.status ?? "",
        },
      ]);
    }
  } catch {
    // Subscription sync failed — will be retried on next billing check
  }

  return new Response();
};
