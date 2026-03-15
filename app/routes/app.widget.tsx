import { useState, useCallback, useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useNavigate, useRouteError } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { getShopSubscription } from "../billing.server";
import { PLAN_LIMITS } from "../plans";
import type { PlanTier } from "../plans";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Button,
  TextField,
  Select,
  Checkbox,
  Divider,
  Box,
  Banner,
  Badge,
} from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  let config = await db.widgetConfig.findUnique({ where: { shop } });

  if (!config) {
    config = await db.widgetConfig.create({ data: { shop } });
  }

  const subscription = await getShopSubscription(shop);

  return { config, subscription };
};

// Helper: sync widget config to an App Installation metafield so the
// storefront Liquid block can read it via app.metafields.zip_checker.widget_config.value
//
// IMPORTANT: ownerId MUST be the App Installation GID (not the Shop GID).
// app.metafields in Liquid only surfaces metafields owned by the App Installation.
// Using the Shop GID writes to shop metafields which are invisible to app.metafields.
async function syncConfigMetafield(
  admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"],
  configData: Record<string, unknown>,
) {
  try {
    // Step 1: get the App Installation GID
    const installResponse = await admin.graphql(
      `query { currentAppInstallation { id } }`,
    );
    const installJson = (await installResponse.json()) as {
      data: { currentAppInstallation: { id: string } };
    };
    const appInstallationGid = installJson.data.currentAppInstallation.id;

    // Step 2: write the metafield to the App Installation
    // Namespace must be plain "zip_checker" (no "$app:" prefix) for App Installation metafields.
    // The Liquid block reads: app.metafields.zip_checker.widget_config.value
    const metaResponse = await admin.graphql(
      `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: appInstallationGid,
              namespace: "zip_checker",
              key: "widget_config",
              type: "json",
              value: JSON.stringify(configData),
            },
          ],
        },
      },
    );
    const metaJson = (await metaResponse.json()) as {
      data: {
        metafieldsSet: {
          metafields: { id: string; namespace: string; key: string }[];
          userErrors: { field: string; message: string }[];
        };
      };
    };

    // userErrors are non-fatal — the API fallback still works
  } catch {
    // Non-fatal — the API fallback still works
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save") {
    const data = {
      position: String(formData.get("position") || "inline"),
      primaryColor: String(formData.get("primaryColor") || "#008060"),
      successColor: String(formData.get("successColor") || "#008060"),
      errorColor: String(formData.get("errorColor") || "#D72C0D"),
      backgroundColor: String(formData.get("backgroundColor") || "#FFFFFF"),
      textColor: String(formData.get("textColor") || "#202223"),
      heading: String(formData.get("heading") || "Check Delivery Availability"),
      placeholder: String(formData.get("placeholder") || "Enter your zip code"),
      buttonText: String(formData.get("buttonText") || "Check"),
      successMessage: String(
        formData.get("successMessage") ||
          "Great news! We deliver to your area.",
      ),
      errorMessage: String(
        formData.get("errorMessage") ||
          "Sorry, we don't deliver to this area yet.",
      ),
      notFoundMessage: String(
        formData.get("notFoundMessage") ||
          "This zip code was not found in our system.",
      ),
      showEta: formData.get("showEta") === "true",
      showZone: formData.get("showZone") === "true",
      showWaitlistOnFailure: formData.get("showWaitlistOnFailure") === "true",
      showCod: formData.get("showCod") === "true",
      showReturnPolicy: formData.get("showReturnPolicy") === "true",
      showCutoffTime: formData.get("showCutoffTime") === "true",
      showDeliveryDays: formData.get("showDeliveryDays") === "true",
      blockCartOnInvalid: formData.get("blockCartOnInvalid") === "true",
      blockCheckoutInCart: formData.get("blockCheckoutInCart") === "true",
      showSocialProof: formData.get("showSocialProof") === "true",
      borderRadius: String(formData.get("borderRadius") || "8"),
      customCss: String(formData.get("customCss") || "") || null,
    };

    await db.widgetConfig.upsert({
      where: { shop },
      create: { shop, ...data },
      update: data,
    });

    await syncConfigMetafield(admin, data);

    return { success: true };
  }

  if (intent === "reset") {
    const resetData = {
      position: "inline",
      primaryColor: "#008060",
      successColor: "#008060",
      errorColor: "#D72C0D",
      backgroundColor: "#FFFFFF",
      textColor: "#202223",
      heading: "Check Delivery Availability",
      placeholder: "Enter your zip code",
      buttonText: "Check",
      successMessage: "Great news! We deliver to your area.",
      errorMessage: "Sorry, we don't deliver to this area yet.",
      notFoundMessage: "This zip code was not found in our system.",
      showEta: true,
      showZone: false,
      showWaitlistOnFailure: false,
      showCod: true,
      showReturnPolicy: true,
      showCutoffTime: true,
      showDeliveryDays: true,
      blockCartOnInvalid: false,
      blockCheckoutInCart: false,
      showSocialProof: true,
      borderRadius: "8",
      customCss: null,
    };

    await db.widgetConfig.upsert({
      where: { shop },
      create: { shop },
      update: resetData,
    });

    await syncConfigMetafield(admin, resetData);

    return { success: true, action: "reset" };
  }

  return null;
};

type WidgetConfig = {
  position: string;
  primaryColor: string;
  successColor: string;
  errorColor: string;
  backgroundColor: string;
  textColor: string;
  heading: string;
  placeholder: string;
  buttonText: string;
  successMessage: string;
  errorMessage: string;
  notFoundMessage: string;
  showEta: boolean;
  showZone: boolean;
  showWaitlistOnFailure: boolean;
  showCod: boolean;
  showReturnPolicy: boolean;
  showCutoffTime: boolean;
  showDeliveryDays: boolean;
  blockCartOnInvalid: boolean;
  blockCheckoutInCart: boolean;
  showSocialProof: boolean;
  borderRadius: string;
  customCss: string | null;
};

// ── Default widget configuration values ─────────────────────────────────────
const DEFAULTS = {
  position: "inline",
  primaryColor: "#008060",
  successColor: "#008060",
  errorColor: "#D72C0D",
  backgroundColor: "#FFFFFF",
  textColor: "#202223",
  heading: "Check Delivery Availability",
  placeholder: "Enter your zip code",
  buttonText: "Check",
  successMessage: "Great news! We deliver to your area.",
  errorMessage: "Sorry, we don't deliver to this area yet.",
  notFoundMessage: "This zip code was not found in our system.",
  showEta: true,
  showZone: false,
  showWaitlistOnFailure: false,
  showCod: true,
  showReturnPolicy: true,
  showCutoffTime: true,
  showDeliveryDays: true,
  blockCartOnInvalid: false,
  blockCheckoutInCart: false,
  showSocialProof: true,
  borderRadius: "8",
  customCss: "",
};

// ── CSS generator — mirrors the Liquid block CSS exactly ────────────────────
function buildWidgetCss(wid: string, cfg: WidgetConfig): string {
  const rad = cfg.borderRadius + "px";
  return (
    "#" + wid + "{" +
      "background:" + cfg.backgroundColor + ";" +
      "color:" + cfg.textColor + ";" +
      "border-radius:" + rad + ";" +
      "padding:24px;" +
      "border:1px solid #e1e3e5;" +
      "max-width:400px;" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
      "box-sizing:border-box;" +
    "}" +
    "#" + wid + " *{box-sizing:border-box}" +
    "#" + wid + " .zcc-heading{font-size:16px;font-weight:600;margin:0 0 16px;color:" + cfg.textColor + "}" +
    "#" + wid + " .zcc-row{display:flex;gap:8px;margin-bottom:0}" +
    "#" + wid + " .zcc-input{" +
      "flex:1;padding:10px 12px;border:1px solid #c9cccf;" +
      "border-radius:" + rad + ";font-size:14px;outline:none;" +
      "background:#fafbfb;color:" + cfg.textColor + ";min-width:0" +
    "}" +
    "#" + wid + " .zcc-input:focus{border-color:" + cfg.primaryColor + ";box-shadow:0 0 0 2px " + cfg.primaryColor + "22}" +
    "#" + wid + " .zcc-btn{" +
      "background:" + cfg.primaryColor + ";color:#fff;border:none;" +
      "border-radius:" + rad + ";padding:10px 20px;font-size:14px;" +
      "font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0" +
    "}" +
    "#" + wid + " .zcc-btn:hover{opacity:.9}" +
    "#" + wid + " .zcc-result{margin-top:12px;padding:12px;border-radius:" + rad + ";font-size:14px;line-height:1.4}" +
    "#" + wid + " .zcc-result.ok{background:" + cfg.successColor + "15;border-left:3px solid " + cfg.successColor + ";color:" + cfg.successColor + "}" +
    "#" + wid + " .zcc-result.fail{background:" + cfg.errorColor + "15;border-left:3px solid " + cfg.errorColor + ";color:" + cfg.errorColor + "}" +
    "#" + wid + " .zcc-meta{margin-top:4px;font-size:13px;opacity:.8}" +
    "#" + wid + " .zcc-cutoff{margin-top:4px;font-size:0.85em;color:#6d7175}" +
    "#" + wid + " .zcc-days{margin-top:4px;font-size:0.85em;color:#6d7175}" +
    "#" + wid + " .zcc-cod{margin-top:4px;font-size:0.85em;font-weight:500}" +
    "#" + wid + " .zcc-cod--available{color:#008060}" +
    "#" + wid + " .zcc-cod--unavailable{color:#d72c0d}" +
    "#" + wid + " .zcc-return-policy{margin-top:4px;font-size:0.85em;color:#6d7175}" +
    "#" + wid + " .zcc-wl{margin-top:10px}" +
    "#" + wid + " .zcc-wl-input{" +
      "width:100%;padding:8px 10px;border:1px solid " + cfg.errorColor + "40;" +
      "border-radius:" + rad + ";font-size:13px;margin-bottom:6px;display:block" +
    "}" +
    "#" + wid + " .zcc-wl-btn{" +
      "background:" + cfg.errorColor + ";color:#fff;border:none;" +
      "border-radius:" + rad + ";padding:8px 16px;font-size:13px;" +
      "cursor:pointer;width:100%;font-weight:600" +
    "}" +
    // Sanitize customCss: strip </style> close tags to prevent injection into <style> elements
    (cfg.customCss ? cfg.customCss.replace(/<\/style>/gi, "") : "")
  );
}

// ── Live Preview component (defined outside WidgetPage to avoid remounting) ─
function WidgetPreview({
  cfg,
  previewState,
}: {
  cfg: WidgetConfig;
  previewState: "idle" | "success" | "error" | "notfound";
}) {
  const wid = "zcc-admin-preview";
  const css = buildWidgetCss(wid, cfg);

  const resultClass =
    previewState === "success" ? "ok" :
    (previewState === "error" || previewState === "notfound") ? "fail" : "";

  const resultMessage =
    previewState === "success" ? cfg.successMessage :
    previewState === "error" ? cfg.errorMessage :
    previewState === "notfound" ? cfg.notFoundMessage : null;

  const widgetHtml = (
    <div id={wid}>
      <p className="zcc-heading">{cfg.heading}</p>
      <div className="zcc-row">
        <input
          className="zcc-input"
          type="text"
          placeholder={cfg.placeholder}
          readOnly
        />
        <button className="zcc-btn" type="button">
          {cfg.buttonText}
        </button>
      </div>
      {resultMessage && (
        <div className={`zcc-result ${resultClass}`}>
          {resultMessage}
          {previewState === "success" && cfg.showEta && (
            <div className="zcc-meta">Estimated delivery: 2–3 business days</div>
          )}
          {previewState === "success" && cfg.showZone && (
            <div className="zcc-meta">Zone: Manhattan</div>
          )}
          {previewState === "success" && cfg.showDeliveryDays && (
            <div className="zcc-meta zcc-days">Delivers: Mon &middot; Tue &middot; Wed &middot; Thu &middot; Fri</div>
          )}
          {previewState === "success" && cfg.showCutoffTime && (
            <div className="zcc-meta zcc-cutoff">Order by 2:00 PM for same-day delivery</div>
          )}
          {previewState === "success" && cfg.showCod && (
            <div className="zcc-cod zcc-cod--available">Cash on Delivery Available</div>
          )}
          {previewState === "success" && cfg.showReturnPolicy && (
            <div className="zcc-return-policy">30-day returns accepted. Exchange within 7 days.</div>
          )}
          {(previewState === "error" || previewState === "notfound") &&
            cfg.showWaitlistOnFailure && (
              <div className="zcc-wl">
                <input
                  className="zcc-wl-input"
                  type="email"
                  placeholder="Enter email to join waitlist"
                  readOnly
                />
                <button className="zcc-wl-btn" type="button">
                  Join Waitlist
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );

  // Floating position: show mock fixed button + collapsible panel concept
  if (cfg.position === "floating") {
    return (
      <>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div
          style={{
            position: "relative",
            minHeight: "120px",
            background: "#f6f6f7",
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          <Text as="p" variant="bodySm" tone="subdued">
            The widget will appear as a fixed button in the bottom-right corner of your storefront.
          </Text>
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "8px",
            }}
          >
            <div id={wid} style={{ maxWidth: "300px" }}>
              <p className="zcc-heading" style={{ marginBottom: "12px" }}>
                {cfg.heading}
              </p>
              <div className="zcc-row">
                <input
                  className="zcc-input"
                  type="text"
                  placeholder={cfg.placeholder}
                  readOnly
                />
                <button className="zcc-btn" type="button">
                  {cfg.buttonText}
                </button>
              </div>
            </div>
            <button
              type="button"
              style={{
                background: cfg.primaryColor,
                color: "#fff",
                border: "none",
                borderRadius: "50px",
                padding: "10px 18px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,.2)",
              }}
            >
              📍 Check Delivery
            </button>
          </div>
        </div>
      </>
    );
  }

  // Popup position: show trigger button + hint of overlay
  if (cfg.position === "popup") {
    return (
      <>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Text as="p" variant="bodySm" tone="subdued">
            A trigger button will appear in the section. Clicking it opens a centered popup.
          </Text>
          <div>
            <button
              type="button"
              style={{
                background: cfg.primaryColor,
                color: "#fff",
                border: "none",
                borderRadius: cfg.borderRadius + "px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Check Delivery Availability
            </button>
          </div>
          <div
            style={{
              background: "rgba(0,0,0,.06)",
              borderRadius: "8px",
              padding: "12px",
              border: "2px dashed #c9cccf",
            }}
          >
            <Text as="p" variant="bodySm" tone="subdued">
              Popup content preview:
            </Text>
            <div style={{ marginTop: "8px" }}>{widgetHtml}</div>
          </div>
        </div>
      </>
    );
  }

  // Inline (default)
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {widgetHtml}
    </>
  );
}

// ── Page component ───────────────────────────────────────────────────────────
export default function WidgetPage() {
  const { config, subscription } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const c = config as unknown as WidgetConfig;

  const limits = PLAN_LIMITS[subscription.planTier as PlanTier];

  // Form state initialized from DB
  const [position, setPosition] = useState(c.position);
  const [primaryColor, setPrimaryColor] = useState(c.primaryColor);
  const [successColor, setSuccessColor] = useState(c.successColor);
  const [errorColor, setErrorColor] = useState(c.errorColor);
  const [backgroundColor, setBackgroundColor] = useState(c.backgroundColor);
  const [textColor, setTextColor] = useState(c.textColor);
  const [heading, setHeading] = useState(c.heading);
  const [placeholder, setPlaceholder] = useState(c.placeholder);
  const [buttonText, setButtonText] = useState(c.buttonText);
  const [successMessage, setSuccessMessage] = useState(c.successMessage);
  const [errorMessage, setErrorMessage] = useState(c.errorMessage);
  const [notFoundMessage, setNotFoundMessage] = useState(c.notFoundMessage);
  const [showEta, setShowEta] = useState(c.showEta);
  const [showZone, setShowZone] = useState(c.showZone);
  const [showWaitlistOnFailure, setShowWaitlistOnFailure] = useState(
    c.showWaitlistOnFailure,
  );
  const [showCod, setShowCod] = useState(c.showCod ?? true);
  const [showReturnPolicy, setShowReturnPolicy] = useState(c.showReturnPolicy ?? true);
  const [showCutoffTime, setShowCutoffTime] = useState(c.showCutoffTime ?? true);
  const [showDeliveryDays, setShowDeliveryDays] = useState(c.showDeliveryDays ?? true);
  const [blockCartOnInvalid, setBlockCartOnInvalid] = useState(c.blockCartOnInvalid ?? false);
  const [blockCheckoutInCart, setBlockCheckoutInCart] = useState(c.blockCheckoutInCart ?? false);
  const [showSocialProof, setShowSocialProof] = useState(c.showSocialProof ?? true);
  const [borderRadius, setBorderRadius] = useState(c.borderRadius);
  const [customCss, setCustomCss] = useState(c.customCss || "");

  // Unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false);

  // Preview state
  const [previewState, setPreviewState] = useState<
    "idle" | "success" | "error" | "notfound"
  >("idle");

  const isSaving =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "save";

  // Clear dirty flag after successful save
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data &&
      "success" in fetcher.data &&
      fetcher.data.success
    ) {
      setIsDirty(false);
    }
  }, [fetcher.state, fetcher.data]);

  // (Save bar managed via Page primaryAction)

  // Dirty-aware setters
  const mark = useCallback(() => setIsDirty(true), []);
  const handlePositionChange = useCallback((v: string) => { setPosition(v); mark(); }, [mark]);
  const handlePrimaryColorChange = useCallback((v: string) => { setPrimaryColor(v); mark(); }, [mark]);
  const handleSuccessColorChange = useCallback((v: string) => { setSuccessColor(v); mark(); }, [mark]);
  const handleErrorColorChange = useCallback((v: string) => { setErrorColor(v); mark(); }, [mark]);
  const handleBackgroundColorChange = useCallback((v: string) => { setBackgroundColor(v); mark(); }, [mark]);
  const handleTextColorChange = useCallback((v: string) => { setTextColor(v); mark(); }, [mark]);
  const handleHeadingChange = useCallback((v: string) => { setHeading(v); mark(); }, [mark]);
  const handlePlaceholderChange = useCallback((v: string) => { setPlaceholder(v); mark(); }, [mark]);
  const handleButtonTextChange = useCallback((v: string) => { setButtonText(v); mark(); }, [mark]);
  const handleSuccessMessageChange = useCallback((v: string) => { setSuccessMessage(v); mark(); }, [mark]);
  const handleErrorMessageChange = useCallback((v: string) => { setErrorMessage(v); mark(); }, [mark]);
  const handleNotFoundMessageChange = useCallback((v: string) => { setNotFoundMessage(v); mark(); }, [mark]);
  const handleShowEtaChange = useCallback((v: boolean) => { setShowEta(v); mark(); }, [mark]);
  const handleShowZoneChange = useCallback((v: boolean) => { setShowZone(v); mark(); }, [mark]);
  const handleShowWaitlistChange = useCallback((v: boolean) => { setShowWaitlistOnFailure(v); mark(); }, [mark]);
  const handleShowCodChange = useCallback((v: boolean) => { setShowCod(v); mark(); }, [mark]);
  const handleShowReturnPolicyChange = useCallback((v: boolean) => { setShowReturnPolicy(v); mark(); }, [mark]);
  const handleShowCutoffTimeChange = useCallback((v: boolean) => { setShowCutoffTime(v); mark(); }, [mark]);
  const handleShowDeliveryDaysChange = useCallback((v: boolean) => { setShowDeliveryDays(v); mark(); }, [mark]);
  const handleBlockCartOnInvalidChange = useCallback((v: boolean) => { setBlockCartOnInvalid(v); mark(); }, [mark]);
  const handleBlockCheckoutInCartChange = useCallback((v: boolean) => { setBlockCheckoutInCart(v); mark(); }, [mark]);
  const handleShowSocialProofChange = useCallback((v: boolean) => { setShowSocialProof(v); mark(); }, [mark]);
  const handleBorderRadiusChange = useCallback((v: string) => { setBorderRadius(v); mark(); }, [mark]);
  const handleCustomCssChange = useCallback((v: string) => { setCustomCss(v); mark(); }, [mark]);

  const handleSave = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", "save");
    fd.set("position", position);
    fd.set("primaryColor", primaryColor);
    fd.set("successColor", successColor);
    fd.set("errorColor", errorColor);
    fd.set("backgroundColor", backgroundColor);
    fd.set("textColor", textColor);
    fd.set("heading", heading);
    fd.set("placeholder", placeholder);
    fd.set("buttonText", buttonText);
    fd.set("successMessage", successMessage);
    fd.set("errorMessage", errorMessage);
    fd.set("notFoundMessage", notFoundMessage);
    fd.set("showEta", String(showEta));
    fd.set("showZone", String(showZone));
    fd.set("showWaitlistOnFailure", String(showWaitlistOnFailure));
    fd.set("showCod", String(showCod));
    fd.set("showReturnPolicy", String(showReturnPolicy));
    fd.set("showCutoffTime", String(showCutoffTime));
    fd.set("showDeliveryDays", String(showDeliveryDays));
    fd.set("blockCartOnInvalid", String(blockCartOnInvalid));
    fd.set("blockCheckoutInCart", String(blockCheckoutInCart));
    fd.set("showSocialProof", String(showSocialProof));
    fd.set("borderRadius", borderRadius);
    fd.set("customCss", customCss);
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Widget settings saved");
  }, [
    position, primaryColor, successColor, errorColor, backgroundColor,
    textColor, heading, placeholder, buttonText, successMessage, errorMessage,
    notFoundMessage, showEta, showZone, showWaitlistOnFailure, showCod,
    showReturnPolicy, showCutoffTime, showDeliveryDays, blockCartOnInvalid,
    blockCheckoutInCart, showSocialProof, borderRadius, customCss,
    fetcher, shopify,
  ]);

  const handleReset = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", "reset");
    fetcher.submit(fd, { method: "POST" });
    setPosition(DEFAULTS.position);
    setPrimaryColor(DEFAULTS.primaryColor);
    setSuccessColor(DEFAULTS.successColor);
    setErrorColor(DEFAULTS.errorColor);
    setBackgroundColor(DEFAULTS.backgroundColor);
    setTextColor(DEFAULTS.textColor);
    setHeading(DEFAULTS.heading);
    setPlaceholder(DEFAULTS.placeholder);
    setButtonText(DEFAULTS.buttonText);
    setSuccessMessage(DEFAULTS.successMessage);
    setErrorMessage(DEFAULTS.errorMessage);
    setNotFoundMessage(DEFAULTS.notFoundMessage);
    setShowEta(DEFAULTS.showEta);
    setShowZone(DEFAULTS.showZone);
    setShowWaitlistOnFailure(DEFAULTS.showWaitlistOnFailure);
    setShowCod(DEFAULTS.showCod);
    setShowReturnPolicy(DEFAULTS.showReturnPolicy);
    setShowCutoffTime(DEFAULTS.showCutoffTime);
    setShowDeliveryDays(DEFAULTS.showDeliveryDays);
    setBlockCartOnInvalid(DEFAULTS.blockCartOnInvalid);
    setBlockCheckoutInCart(DEFAULTS.blockCheckoutInCart);
    setShowSocialProof(DEFAULTS.showSocialProof);
    setBorderRadius(DEFAULTS.borderRadius);
    setCustomCss(DEFAULTS.customCss);
    setPreviewState("idle");
    setIsDirty(false);
    shopify.toast.show("Widget settings reset to defaults");
  }, [fetcher, shopify]);

  const positionOptions = [
    { label: "Inline — embedded directly in the section", value: "inline" },
    { label: "Floating — fixed button in the corner", value: "floating" },
    { label: "Popup — trigger button opens a modal", value: "popup" },
  ];

  // Current config snapshot for the preview
  const previewCfg: WidgetConfig = {
    position, primaryColor, successColor, errorColor, backgroundColor,
    textColor, heading, placeholder, buttonText, successMessage, errorMessage,
    notFoundMessage, showEta, showZone, showWaitlistOnFailure, showCod,
    showReturnPolicy, showCutoffTime, showDeliveryDays, blockCartOnInvalid,
    blockCheckoutInCart, showSocialProof, borderRadius, customCss,
  };

  const handleDiscard = useCallback(() => {
    setPosition(c.position);
    setPrimaryColor(c.primaryColor);
    setSuccessColor(c.successColor);
    setErrorColor(c.errorColor);
    setBackgroundColor(c.backgroundColor);
    setTextColor(c.textColor);
    setHeading(c.heading);
    setPlaceholder(c.placeholder);
    setButtonText(c.buttonText);
    setSuccessMessage(c.successMessage);
    setErrorMessage(c.errorMessage);
    setNotFoundMessage(c.notFoundMessage);
    setShowEta(c.showEta);
    setShowZone(c.showZone);
    setShowWaitlistOnFailure(c.showWaitlistOnFailure);
    setShowCod(c.showCod ?? true);
    setShowReturnPolicy(c.showReturnPolicy ?? true);
    setShowCutoffTime(c.showCutoffTime ?? true);
    setShowDeliveryDays(c.showDeliveryDays ?? true);
    setBlockCartOnInvalid(c.blockCartOnInvalid ?? false);
    setBlockCheckoutInCart(c.blockCheckoutInCart ?? false);
    setShowSocialProof(c.showSocialProof ?? true);
    setBorderRadius(c.borderRadius);
    setCustomCss(c.customCss || "");
    setIsDirty(false);
    setPreviewState("idle");
  }, [c]);

  return (
    <Page
      title="Widget Customization"
      subtitle="Customize how the zip code checker looks on your storefront"
      backAction={{ onAction: () => navigate("/app") }}
      primaryAction={isDirty ? {
        content: "Save Changes",
        onAction: handleSave,
        loading: isSaving,
      } : undefined}
      secondaryActions={[
        ...(isDirty ? [{
          content: "Discard",
          onAction: handleDiscard,
        }] : []),
        {
          content: "Reset to Defaults",
          onAction: handleReset,
        },
      ]}
    >
      <Box paddingBlockEnd="1600">
        <Layout>

          {/* Settings + Preview */}
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400" alignItems="start">
              {/* ── Settings Column ── */}
              <BlockStack gap="400">
                {/* Layout */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Layout
                      </Text>
                      {!limits.widgetFullCustom && (
                        <Badge tone="info">Starter+</Badge>
                      )}
                    </InlineStack>
                    <Select
                      label="Widget Position"
                      options={positionOptions}
                      value={position}
                      onChange={handlePositionChange}
                      disabled={!limits.widgetFullCustom}
                      helpText={
                        position === "floating"
                          ? "Widget appears as a fixed button in the bottom-right corner of every page."
                          : position === "popup"
                          ? "A trigger button shows in the block. Clicking it opens a centered popup overlay."
                          : "Widget renders directly where you place the block in the Theme Editor."
                      }
                    />
                    <TextField
                      label="Border Radius (px)"
                      type="number"
                      value={borderRadius}
                      onChange={handleBorderRadiusChange}
                      autoComplete="off"
                      disabled={!limits.widgetFullCustom}
                      helpText="Roundness of corners. 0 = square, 16 = very rounded."
                    />
                    {!limits.widgetFullCustom && (
                      <Banner tone="info">
                        <Text as="p" variant="bodySm">
                          Upgrade to Starter to customize widget position and layout.{" "}
                          <Button
                            variant="plain"
                            onClick={() => navigate("/app/pricing")}
                          >
                            View plans
                          </Button>
                        </Text>
                      </Banner>
                    )}
                  </BlockStack>
                </Card>

                {/* Colors */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Colors
                      </Text>
                      {!limits.widgetFullCustom && (
                        <Badge tone="info">Starter+</Badge>
                      )}
                    </InlineStack>
                    <InlineStack gap="300" wrap>
                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm">
                            Button Color
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => handlePrimaryColorChange(e.target.value)}
                              disabled={!limits.widgetFullCustom}
                              style={{
                                width: "36px",
                                height: "36px",
                                border: "1px solid #ccc",
                                borderRadius: "6px",
                                cursor: limits.widgetFullCustom ? "pointer" : "not-allowed",
                                padding: "2px",
                                opacity: limits.widgetFullCustom ? 1 : 0.5,
                              }}
                            />
                            <TextField
                              label="Button"
                              labelHidden
                              value={primaryColor}
                              onChange={handlePrimaryColorChange}
                              autoComplete="off"
                              disabled={!limits.widgetFullCustom}
                            />
                          </InlineStack>
                        </BlockStack>
                      </div>
                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm">
                            Success Color
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <input
                              type="color"
                              value={successColor}
                              onChange={(e) => handleSuccessColorChange(e.target.value)}
                              disabled={!limits.widgetFullCustom}
                              style={{
                                width: "36px",
                                height: "36px",
                                border: "1px solid #ccc",
                                borderRadius: "6px",
                                cursor: limits.widgetFullCustom ? "pointer" : "not-allowed",
                                padding: "2px",
                                opacity: limits.widgetFullCustom ? 1 : 0.5,
                              }}
                            />
                            <TextField
                              label="Success"
                              labelHidden
                              value={successColor}
                              onChange={handleSuccessColorChange}
                              autoComplete="off"
                              disabled={!limits.widgetFullCustom}
                            />
                          </InlineStack>
                        </BlockStack>
                      </div>
                    </InlineStack>
                    <InlineStack gap="300" wrap>
                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm">
                            Error Color
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <input
                              type="color"
                              value={errorColor}
                              onChange={(e) => handleErrorColorChange(e.target.value)}
                              disabled={!limits.widgetFullCustom}
                              style={{
                                width: "36px",
                                height: "36px",
                                border: "1px solid #ccc",
                                borderRadius: "6px",
                                cursor: limits.widgetFullCustom ? "pointer" : "not-allowed",
                                padding: "2px",
                                opacity: limits.widgetFullCustom ? 1 : 0.5,
                              }}
                            />
                            <TextField
                              label="Error"
                              labelHidden
                              value={errorColor}
                              onChange={handleErrorColorChange}
                              autoComplete="off"
                              disabled={!limits.widgetFullCustom}
                            />
                          </InlineStack>
                        </BlockStack>
                      </div>
                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm">
                            Background
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <input
                              type="color"
                              value={backgroundColor}
                              onChange={(e) => handleBackgroundColorChange(e.target.value)}
                              disabled={!limits.widgetFullCustom}
                              style={{
                                width: "36px",
                                height: "36px",
                                border: "1px solid #ccc",
                                borderRadius: "6px",
                                cursor: limits.widgetFullCustom ? "pointer" : "not-allowed",
                                padding: "2px",
                                opacity: limits.widgetFullCustom ? 1 : 0.5,
                              }}
                            />
                            <TextField
                              label="BG"
                              labelHidden
                              value={backgroundColor}
                              onChange={handleBackgroundColorChange}
                              autoComplete="off"
                              disabled={!limits.widgetFullCustom}
                            />
                          </InlineStack>
                        </BlockStack>
                      </div>
                    </InlineStack>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm">
                        Text Color
                      </Text>
                      <InlineStack gap="200" blockAlign="center">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => handleTextColorChange(e.target.value)}
                          disabled={!limits.widgetFullCustom}
                          style={{
                            width: "36px",
                            height: "36px",
                            border: "1px solid #ccc",
                            borderRadius: "6px",
                            cursor: limits.widgetFullCustom ? "pointer" : "not-allowed",
                            padding: "2px",
                            opacity: limits.widgetFullCustom ? 1 : 0.5,
                          }}
                        />
                        <TextField
                          label="Text"
                          labelHidden
                          value={textColor}
                          onChange={handleTextColorChange}
                          autoComplete="off"
                          disabled={!limits.widgetFullCustom}
                        />
                      </InlineStack>
                    </BlockStack>
                    {!limits.widgetFullCustom && (
                      <Banner tone="info">
                        <Text as="p" variant="bodySm">
                          Upgrade to Starter to customize widget colors.{" "}
                          <Button
                            variant="plain"
                            onClick={() => navigate("/app/pricing")}
                          >
                            View plans
                          </Button>
                        </Text>
                      </Banner>
                    )}
                  </BlockStack>
                </Card>

                {/* Text Content */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Text Content
                    </Text>
                    <TextField
                      label="Heading"
                      value={heading}
                      onChange={handleHeadingChange}
                      autoComplete="off"
                    />
                    <InlineStack gap="300">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Placeholder"
                          value={placeholder}
                          onChange={handlePlaceholderChange}
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Button Text"
                          value={buttonText}
                          onChange={handleButtonTextChange}
                          autoComplete="off"
                        />
                      </div>
                    </InlineStack>
                    <TextField
                      label="Success Message"
                      value={successMessage}
                      onChange={handleSuccessMessageChange}
                      autoComplete="off"
                      multiline={2}
                    />
                    <TextField
                      label="Error Message (blocked)"
                      value={errorMessage}
                      onChange={handleErrorMessageChange}
                      autoComplete="off"
                      multiline={2}
                    />
                    <TextField
                      label="Not Found Message"
                      value={notFoundMessage}
                      onChange={handleNotFoundMessageChange}
                      autoComplete="off"
                      multiline={2}
                    />
                  </BlockStack>
                </Card>

                {/* Display Options */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Display Options
                      </Text>
                      {!limits.showEtaCodReturn && (
                        <Badge tone="info">Starter+</Badge>
                      )}
                    </InlineStack>
                    <Checkbox
                      label="Show estimated delivery time (ETA)"
                      checked={showEta}
                      onChange={handleShowEtaChange}
                      disabled={!limits.showEtaCodReturn}
                      helpText="Display the ETA below the success message when available."
                    />
                    <Checkbox
                      label="Show delivery zone name"
                      checked={showZone}
                      onChange={handleShowZoneChange}
                      helpText="Display the zone name in the success message."
                    />
                    <Checkbox
                      label="Show waitlist form on blocked/not-found zip codes"
                      checked={showWaitlistOnFailure}
                      onChange={handleShowWaitlistChange}
                      helpText="Let customers enter their email to join a waitlist when their zip code isn't available."
                    />
                    <Checkbox
                      label="Show cutoff time"
                      checked={showCutoffTime}
                      onChange={handleShowCutoffTimeChange}
                      helpText="Display order cutoff time for same-day delivery (from the matched delivery rule)."
                    />
                    <Checkbox
                      label="Show delivery days"
                      checked={showDeliveryDays}
                      onChange={handleShowDeliveryDaysChange}
                      helpText="Display which days of the week delivery is available (from the matched delivery rule)."
                    />
                    <Checkbox
                      label="Show COD (Cash on Delivery) availability"
                      checked={showCod}
                      onChange={handleShowCodChange}
                      disabled={!limits.showEtaCodReturn}
                      helpText="Display whether cash on delivery is available for the entered zip code."
                    />
                    <Checkbox
                      label="Show return / exchange policy"
                      checked={showReturnPolicy}
                      onChange={handleShowReturnPolicyChange}
                      disabled={!limits.showEtaCodReturn}
                      helpText="Display the return and exchange policy associated with the entered zip code."
                    />
                    {!limits.showEtaCodReturn && (
                      <Banner tone="info">
                        <Text as="p" variant="bodySm">
                          Upgrade to Starter to enable ETA, COD, and return policy toggles.{" "}
                          <Button
                            variant="plain"
                            onClick={() => navigate("/app/pricing")}
                          >
                            View plans
                          </Button>
                        </Text>
                      </Banner>
                    )}
                    <Divider />
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingMd" as="h3">Purchase Protection</Text>
                      {!limits.cartBlocking && (
                        <Badge tone="info">Pro+</Badge>
                      )}
                    </InlineStack>
                    <Checkbox
                      label="Block Add to Cart for unserviceable ZIP codes"
                      helpText="Disables the Add to Cart and Buy Now buttons when a customer enters an invalid ZIP code. Buttons re-enable on a valid check."
                      checked={blockCartOnInvalid}
                      onChange={handleBlockCartOnInvalidChange}
                      disabled={!limits.cartBlocking}
                    />
                    <Checkbox
                      label="Block checkout in cart for unserviceable ZIP codes"
                      helpText="Shows a warning and hides the checkout button on the cart page if the last checked ZIP was unserviceable. Requires the Cart Validator block on your cart page."
                      checked={blockCheckoutInCart}
                      onChange={handleBlockCheckoutInCartChange}
                      disabled={!limits.cartBlocking}
                    />
                    {!limits.cartBlocking && (
                      <Banner tone="info">
                        <Text as="p" variant="bodySm">
                          Upgrade to Pro to enable cart and checkout blocking for unserviceable ZIP codes.{" "}
                          <Button
                            variant="plain"
                            onClick={() => navigate("/app/pricing")}
                          >
                            View plans
                          </Button>
                        </Text>
                      </Banner>
                    )}
                    <Divider />
                    <Text variant="headingMd" as="h3">Waitlist Engagement</Text>
                    <Checkbox
                      label="Show social proof on waitlist form"
                      helpText="Displays how many other customers are waiting for delivery to the same ZIP code. Example: 'Join 23 others waiting for delivery to your area.'"
                      checked={showSocialProof}
                      onChange={handleShowSocialProofChange}
                    />
                  </BlockStack>
                </Card>

                {/* Custom CSS */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Custom CSS
                      </Text>
                      {!limits.customCss && (
                        <Badge tone="info">Ultimate</Badge>
                      )}
                    </InlineStack>
                    <TextField
                      label="Custom CSS"
                      labelHidden
                      value={customCss}
                      onChange={handleCustomCssChange}
                      multiline={4}
                      placeholder=".zcc-heading { font-size: 18px; } .zcc-btn { border-radius: 4px; }"
                      autoComplete="off"
                      disabled={!limits.customCss}
                      helpText="Target .zcc-heading, .zcc-btn, .zcc-input, .zcc-result, .zcc-meta classes."
                    />
                    {!limits.customCss && (
                      <Banner tone="info">
                        <Text as="p" variant="bodySm">
                          Upgrade to Ultimate to add custom CSS overrides.{" "}
                          <Button
                            variant="plain"
                            onClick={() => navigate("/app/pricing")}
                          >
                            View plans
                          </Button>
                        </Text>
                      </Banner>
                    )}
                  </BlockStack>
                </Card>
              </BlockStack>

              {/* ── Live Preview Column ── */}
              <div style={{ position: "sticky", top: "16px", alignSelf: "start" }}>
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Live Preview
                    </Text>
                    <Divider />

                    {/* Preview toggle buttons */}
                    <InlineStack gap="200" wrap>
                      <Button
                        size="slim"
                        pressed={previewState === "idle"}
                        onClick={() => setPreviewState("idle")}
                      >
                        Default
                      </Button>
                      <Button
                        size="slim"
                        pressed={previewState === "success"}
                        onClick={() => setPreviewState("success")}
                      >
                        Success
                      </Button>
                      <Button
                        size="slim"
                        pressed={previewState === "error"}
                        onClick={() => setPreviewState("error")}
                      >
                        Blocked
                      </Button>
                      <Button
                        size="slim"
                        pressed={previewState === "notfound"}
                        onClick={() => setPreviewState("notfound")}
                      >
                        Not Found
                      </Button>
                    </InlineStack>

                    {/* Preview widget */}
                    <Box
                      padding="400"
                      background="bg-surface-secondary"
                      borderRadius="200"
                    >
                      <WidgetPreview cfg={previewCfg} previewState={previewState} />
                    </Box>

                    <Text as="p" tone="subdued" variant="bodySm">
                      Preview reflects all current settings including custom CSS.
                      Click state buttons above to see different scenarios.
                    </Text>
                  </BlockStack>
                </Card>
              </div>
            </InlineGrid>
          </Layout.Section>
        </Layout>
      </Box>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
