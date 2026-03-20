/**
 * Centralized Postmark email service.
 *
 * All send functions return `true` on success, `false` on failure — they never
 * throw. This lets callers fire-and-forget without wrapping in try/catch.
 */
import { ServerClient } from "postmark";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let client: ServerClient | null = null;

function getClient(): ServerClient | null {
  if (client) return client;
  const apiKey = process.env.POSTMARK_API_KEY;
  if (!apiKey) {
    console.warn("[email] POSTMARK_API_KEY not set — emails will be skipped");
    return null;
  }
  client = new ServerClient(apiKey);
  return client;
}

function getFromEmail(): string {
  return process.env.POSTMARK_FROM_EMAIL || "noreply@example.com";
}

function shopDisplayName(shop: string): string {
  return shop.replace(".myshopify.com", "");
}

// ---------------------------------------------------------------------------
// 1. Waitlist Confirmation  (App → Customer)
// ---------------------------------------------------------------------------

export async function sendWaitlistConfirmation(
  to: string,
  zipCode: string,
  shop: string,
): Promise<boolean> {
  const pm = getClient();
  if (!pm) return false;

  const name = shopDisplayName(shop);

  try {
    await pm.sendEmail({
      From: getFromEmail(),
      To: to,
      Subject: `You're on the waitlist — ${name}`,
      HtmlBody: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">You're on the waitlist!</h2>
          <p>Thanks for signing up. We'll let you know as soon as delivery is available to <strong>${zipCode}</strong>.</p>
          <p style="color:#666;font-size:13px;margin-top:24px">— ${name}</p>
        </div>
      `,
      TextBody: `You're on the waitlist!\n\nThanks for signing up. We'll let you know as soon as delivery is available to ${zipCode}.\n\n— ${name}`,
      MessageStream: "outbound",
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send waitlist confirmation:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 2. Merchant Alert  (App → Merchant)
// ---------------------------------------------------------------------------

export async function sendMerchantWaitlistAlert(
  to: string,
  customerEmail: string,
  zipCode: string,
  shop: string,
): Promise<boolean> {
  const pm = getClient();
  if (!pm) return false;

  const name = shopDisplayName(shop);

  try {
    await pm.sendEmail({
      From: getFromEmail(),
      To: to,
      Subject: `New waitlist signup: ${zipCode}`,
      HtmlBody: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">New waitlist signup</h2>
          <p>A customer just joined the waitlist for ZIP code <strong>${zipCode}</strong>.</p>
          <table style="margin:16px 0;border-collapse:collapse">
            <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td>${customerEmail}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666">ZIP Code</td><td>${zipCode}</td></tr>
          </table>
          <p style="color:#666;font-size:13px">You can manage the waitlist from your <strong>${name}</strong> admin dashboard.</p>
        </div>
      `,
      TextBody: `New waitlist signup\n\nA customer (${customerEmail}) just joined the waitlist for ZIP code ${zipCode}.\n\nManage the waitlist from your ${name} admin dashboard.`,
      MessageStream: "outbound",
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send merchant waitlist alert:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 3. ZIP Available Notification  (App → Customer)
// ---------------------------------------------------------------------------

export async function sendZipAvailableNotification(
  to: string,
  zipCode: string,
  shop: string,
  shopUrl: string,
): Promise<boolean> {
  const pm = getClient();
  if (!pm) return false;

  const name = shopDisplayName(shop);

  try {
    await pm.sendEmail({
      From: getFromEmail(),
      To: to,
      Subject: `Great news! We now deliver to ${zipCode}`,
      HtmlBody: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">Great news!</h2>
          <p>We're excited to let you know that delivery is now available to ZIP code <strong>${zipCode}</strong>.</p>
          <p><a href="${shopUrl}" style="display:inline-block;padding:10px 20px;background:#008060;color:#fff;text-decoration:none;border-radius:4px;margin-top:8px">Shop Now</a></p>
          <p style="color:#666;font-size:13px;margin-top:24px">— ${name}</p>
        </div>
      `,
      TextBody: `Great news!\n\nDelivery is now available to ZIP code ${zipCode}. Visit ${shopUrl} to place your order.\n\n— ${name}`,
      MessageStream: "outbound",
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send ZIP available notification:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 4. Test Email  (Settings page)
// ---------------------------------------------------------------------------

export async function sendTestEmail(to: string): Promise<boolean> {
  const pm = getClient();
  if (!pm) return false;

  try {
    await pm.sendEmail({
      From: getFromEmail(),
      To: to,
      Subject: "Pinzo — Test Email",
      HtmlBody: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px">Test email received!</h2>
          <p>Your Postmark email integration is working correctly. You will receive notifications when customers join your waitlist.</p>
        </div>
      `,
      TextBody: "Test email received!\n\nYour Postmark email integration is working correctly. You will receive notifications when customers join your waitlist.",
      MessageStream: "outbound",
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send test email:", error);
    return false;
  }
}
