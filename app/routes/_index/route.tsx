import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";
import type { CSSProperties } from "react";
import { useState } from "react";
import { login } from "../../shopify.server";

import {
  AppProvider,
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Grid,
  Icon,
  InlineStack,
  Text,
  TextField,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  DeliveryIcon,
  EmailIcon,
  ImportIcon,
  LocationIcon,
  SettingsIcon,
  ThemeTemplateIcon,
} from "@shopify/polaris-icons";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import enTranslations from "@shopify/polaris/locales/en.json";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

const featureIconStyle: CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "var(--p-border-radius-200)",
  background: "var(--p-color-bg-fill-success-secondary, #e3f1df)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const features = [
  {
    icon: CheckCircleIcon,
    title: "Allowed & Blocked Zip Codes",
    description:
      "Define exactly which areas you deliver to. Block unsupported zip codes with a clear message so customers know upfront.",
  },
  {
    icon: DeliveryIcon,
    title: "Delivery Zones & ETAs",
    description:
      "Group zip codes into zones and show estimated delivery times. Set custom messages per zip code or zone.",
  },
  {
    icon: ThemeTemplateIcon,
    title: "Customisable Widget",
    description:
      "Embed a fully styled zip code checker on your storefront. Control colours, text, position, and more without touching code.",
  },
  {
    icon: ImportIcon,
    title: "Bulk Import & Export",
    description:
      "Upload thousands of zip codes via CSV in seconds. Export your entire list anytime for backup or editing.",
  },
  {
    icon: EmailIcon,
    title: "Customer Waitlist",
    description:
      "Capture emails from customers in unsupported areas. Notify them when you expand delivery to their zip code.",
  },
  {
    icon: SettingsIcon,
    title: "Delivery Rules",
    description:
      "Set zone-based rules including minimum order amounts, delivery fees, cutoff times, and days of the week.",
  },
];

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();
  const [shop, setShop] = useState("");

  return (
    <AppProvider i18n={enTranslations}>
      {/* Page shell */}
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "var(--p-color-bg)",
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            background: "var(--p-color-bg-surface)",
            borderBottom:
              "var(--p-border-width-025) solid var(--p-color-border)",
          }}
        >
          <Box
            paddingBlockStart="300"
            paddingBlockEnd="300"
            paddingInlineStart="600"
            paddingInlineEnd="600"
          >
            <InlineStack gap="200" blockAlign="center">
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--p-border-radius-200)",
                  background:
                    "var(--p-color-bg-fill-success-secondary, #e3f1df)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon source={LocationIcon} tone="success" />
              </div>
              <Text as="span" variant="headingMd" fontWeight="bold">
                Pinzo
              </Text>
            </InlineStack>
          </Box>
        </header>

        {/* ── Main ── */}
        <main style={{ flex: 1 }}>
          <div
            style={{
              maxWidth: "1100px",
              width: "100%",
              margin: "0 auto",
              boxSizing: "border-box",
            }}
          >
            <Box
              paddingBlockStart="1200"
              paddingBlockEnd="1600"
              paddingInlineStart="600"
              paddingInlineEnd="600"
            >
              {/* Hero */}
              <Box paddingBlockEnd="1200">
                <BlockStack gap="500" inlineAlign="center">
                  <Badge tone="success">Shopify App</Badge>

                  <Text
                    as="h1"
                    variant="heading3xl"
                    fontWeight="bold"
                    alignment="center"
                  >
                    Control Delivery by{" "}
                    <span style={{ color: "var(--p-color-text-success)" }}>
                      Zip Code
                    </span>
                  </Text>

                  <div style={{ maxWidth: "600px" }}>
                    <Text
                      as="p"
                      variant="bodyLg"
                      tone="subdued"
                      alignment="center"
                    >
                      Let customers check delivery availability instantly.
                      Manage allowed and blocked zip codes, set delivery zones,
                      ETAs, and customise your storefront widget — all in one
                      place.
                    </Text>
                  </div>

                  {showForm && (
                    <div style={{ width: "100%", maxWidth: "480px" }}>
                      <form method="post" action="/auth/login">
                        <BlockStack gap="200">
                          <InlineStack
                            gap="200"
                            blockAlign="center"
                            wrap={false}
                          >
                            {/* minWidth:0 prevents flex child from overflowing on narrow screens */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <TextField
                                label="Shopify store domain"
                                labelHidden
                                value={shop}
                                onChange={setShop}
                                name="shop"
                                placeholder="your-store.myshopify.com"
                                autoComplete="off"
                              />
                            </div>
                            <Button variant="primary" submit size="large">
                              Install App
                            </Button>
                          </InlineStack>
                          <Text
                            as="p"
                            variant="bodySm"
                            tone="subdued"
                            alignment="center"
                          >
                            Enter your Shopify store domain to get started
                          </Text>
                        </BlockStack>
                      </form>
                    </div>
                  )}
                </BlockStack>
              </Box>

              {/* Features grid
                  xs: 6 → 1 card/row  on mobile  (6/6 = 100%)
                  sm: 3 → 2 cards/row on tablet   (3/6 = 50%)
                  md: 4 → 3 cards/row on desktop  (4/12 = 33%)
              */}
              <Grid gap={{ xs: "400", sm: "400", md: "500" }}>
                {features.map((feature) => (
                  <Grid.Cell
                    key={feature.title}
                    columnSpan={{ xs: 6, sm: 3, md: 4, lg: 4, xl: 4 }}
                  >
                    {/* height:100% ensures equal-height cards in each row */}
                    <div style={{ height: "100%", display: "flex" }}>
                      <Card>
                        <BlockStack gap="400">
                          <div style={featureIconStyle}>
                            <Icon source={feature.icon} tone="success" />
                          </div>
                          <Text as="h3" variant="headingSm" fontWeight="bold">
                            {feature.title}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {feature.description}
                          </Text>
                        </BlockStack>
                      </Card>
                    </div>
                  </Grid.Cell>
                ))}
              </Grid>
            </Box>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer
          style={{
            background: "var(--p-color-bg-surface)",
            borderTop:
              "var(--p-border-width-025) solid var(--p-color-border-secondary)",
          }}
        >
          <Box
            paddingBlockStart="400"
            paddingBlockEnd="400"
            paddingInlineStart="600"
            paddingInlineEnd="600"
          >
            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
              Built for Shopify merchants — Pinzo
            </Text>
          </Box>
        </footer>
      </div>
    </AppProvider>
  );
}
