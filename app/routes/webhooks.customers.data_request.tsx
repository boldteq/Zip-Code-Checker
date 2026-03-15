/**
 * GDPR: customers/data_request
 *
 * Shopify sends this when a customer requests a copy of their data.
 * You must respond within 30 days by sending the data to the customer.
 *
 * Required for Shopify App Store listing.
 * https://shopify.dev/docs/apps/build/privacy-law-compliance
 */
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  const customerEmail = payload?.customer?.email;

  // Look up any data stored for this customer.
  // For this app, the only customer PII stored is waitlist entries (email + zip).
  // Shopify does not auto-send the data — you must respond within 30 days.
  if (customerEmail) {
    await db.waitlistEntry.findMany({
      where: { shop, email: customerEmail },
      select: { zipCode: true, status: true, createdAt: true },
    });
  }

  return new Response();
};
