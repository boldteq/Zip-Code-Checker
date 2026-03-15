import { useState, useCallback } from "react";
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
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  TextField,
  Select,
  Modal,
  DataTable,
  EmptyState,
  Divider,
  Box,
  Tooltip,
  Checkbox,
  Banner,
} from "@shopify/polaris";
import { PlusIcon, DeleteIcon, EditIcon } from "@shopify/polaris-icons";

const DAYS_OPTIONS = [
  { label: "Monday", value: "Mon" },
  { label: "Tuesday", value: "Tue" },
  { label: "Wednesday", value: "Wed" },
  { label: "Thursday", value: "Thu" },
  { label: "Friday", value: "Fri" },
  { label: "Saturday", value: "Sat" },
  { label: "Sunday", value: "Sun" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [rules, zones, subscription] = await Promise.all([
    db.deliveryRule.findMany({
      where: { shop },
      orderBy: { priority: "asc" },
    }),
    db.zipCode.findMany({
      where: { shop, zone: { not: null } },
      select: { zone: true },
      distinct: ["zone"],
    }),
    getShopSubscription(shop),
  ]);

  return {
    rules,
    zones: zones.map((z) => z.zone).filter(Boolean) as string[],
    subscription,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create" || intent === "update") {
    const id = String(formData.get("id") || "");
    const name = String(formData.get("name") || "").trim();
    const zone = String(formData.get("zone") || "").trim() || null;
    const zipCodes = String(formData.get("zipCodes") || "").trim() || null;
    const minOrderAmount = formData.get("minOrderAmount")
      ? parseFloat(String(formData.get("minOrderAmount")))
      : null;
    const deliveryFee = formData.get("deliveryFee")
      ? parseFloat(String(formData.get("deliveryFee")))
      : null;
    const freeShippingAbove = formData.get("freeShippingAbove")
      ? parseFloat(String(formData.get("freeShippingAbove")))
      : null;
    const estimatedDays =
      String(formData.get("estimatedDays") || "").trim() || null;
    const cutoffTime =
      String(formData.get("cutoffTime") || "").trim() || null;
    const daysOfWeek =
      String(formData.get("daysOfWeek") || "").trim() || null;
    const priority = parseInt(String(formData.get("priority") || "0"), 10);

    if (!name) return { error: "Rule name is required." };

    const data = {
      name,
      zone,
      zipCodes,
      minOrderAmount,
      deliveryFee,
      freeShippingAbove,
      estimatedDays,
      cutoffTime,
      daysOfWeek,
      priority,
    };

    if (intent === "update" && id) {
      await db.deliveryRule.update({ where: { id }, data });
      return { success: true, action: "updated" };
    } else {
      // Plan-gating: check limits before creating a new rule
      const subscription = await getShopSubscription(shop);
      const { maxDeliveryRules, label: planLabel } = subscription.limits;

      if (maxDeliveryRules === 0) {
        return {
          error:
            "Delivery rules are not available on the Free plan. Upgrade to Starter or Pro.",
        };
      }

      if (isFinite(maxDeliveryRules)) {
        const currentCount = await db.deliveryRule.count({ where: { shop } });
        if (currentCount >= maxDeliveryRules) {
          return {
            error: `You've reached the ${maxDeliveryRules} delivery rule limit on the ${planLabel} plan. Upgrade to Pro for unlimited rules.`,
          };
        }
      }

      await db.deliveryRule.create({ data: { shop, ...data } });
      return { success: true, action: "created" };
    }
  }

  if (intent === "delete") {
    const id = String(formData.get("id"));
    await db.deliveryRule.delete({ where: { id } });
    return { success: true, action: "deleted" };
  }

  if (intent === "toggle") {
    const id = String(formData.get("id"));
    const isActive = formData.get("isActive") === "true";
    await db.deliveryRule.update({
      where: { id },
      data: { isActive: !isActive },
    });
    return { success: true, action: "toggled" };
  }

  return null;
};

type Rule = {
  id: string;
  name: string;
  zone: string | null;
  zipCodes: string | null;
  minOrderAmount: number | null;
  deliveryFee: number | null;
  freeShippingAbove: number | null;
  estimatedDays: string | null;
  cutoffTime: string | null;
  daysOfWeek: string | null;
  isActive: boolean;
  priority: number;
};

export default function DeliveryRulesPage() {
  const { rules, zones, subscription } = useLoaderData<typeof loader>();
  const limits = PLAN_LIMITS[subscription.planTier];
  const isFreePlan = limits.maxDeliveryRules === 0;
  const hasFiniteLimit = isFinite(limits.maxDeliveryRules) && !isFreePlan;
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [zipCodes, setZipCodes] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [freeShippingAbove, setFreeShippingAbove] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [cutoffTime, setCutoffTime] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ]);
  const [priority, setPriority] = useState("0");

  const actionError =
    fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  const resetForm = useCallback(() => {
    setName("");
    setZone("");
    setZipCodes("");
    setMinOrderAmount("");
    setDeliveryFee("");
    setFreeShippingAbove("");
    setEstimatedDays("");
    setCutoffTime("");
    setSelectedDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    setPriority("0");
    setEditingRule(null);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setModalOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((rule: Rule) => {
    setEditingRule(rule);
    setName(rule.name);
    setZone(rule.zone || "");
    setZipCodes(rule.zipCodes || "");
    setMinOrderAmount(rule.minOrderAmount != null ? String(rule.minOrderAmount) : "");
    setDeliveryFee(rule.deliveryFee != null ? String(rule.deliveryFee) : "");
    setFreeShippingAbove(
      rule.freeShippingAbove != null ? String(rule.freeShippingAbove) : "",
    );
    setEstimatedDays(rule.estimatedDays || "");
    setCutoffTime(rule.cutoffTime || "");
    setSelectedDays(rule.daysOfWeek ? rule.daysOfWeek.split(",") : []);
    setPriority(String(rule.priority));
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", editingRule ? "update" : "create");
    if (editingRule) fd.set("id", editingRule.id);
    fd.set("name", name);
    fd.set("zone", zone);
    fd.set("zipCodes", zipCodes);
    fd.set("minOrderAmount", minOrderAmount);
    fd.set("deliveryFee", deliveryFee);
    fd.set("freeShippingAbove", freeShippingAbove);
    fd.set("estimatedDays", estimatedDays);
    fd.set("cutoffTime", cutoffTime);
    fd.set("daysOfWeek", selectedDays.join(","));
    fd.set("priority", priority);
    fetcher.submit(fd, { method: "POST" });
    setModalOpen(false);
    resetForm();
    shopify.toast.show(editingRule ? "Rule updated" : "Rule created");
  }, [
    editingRule,
    name,
    zone,
    zipCodes,
    minOrderAmount,
    deliveryFee,
    freeShippingAbove,
    estimatedDays,
    cutoffTime,
    selectedDays,
    priority,
    fetcher,
    resetForm,
    shopify,
  ]);

  const handleDelete = useCallback(
    (id: string) => {
      const fd = new FormData();
      fd.set("intent", "delete");
      fd.set("id", id);
      fetcher.submit(fd, { method: "POST" });
      shopify.toast.show("Rule deleted");
    },
    [fetcher, shopify],
  );

  const handleToggle = useCallback(
    (id: string, isActive: boolean) => {
      const fd = new FormData();
      fd.set("intent", "toggle");
      fd.set("id", id);
      fd.set("isActive", String(isActive));
      fetcher.submit(fd, { method: "POST" });
    },
    [fetcher],
  );

  const toggleDay = useCallback(
    (day: string) => {
      setSelectedDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
      );
    },
    [],
  );

  const zoneOptions = [
    { label: "All zones", value: "" },
    ...zones.map((z) => ({ label: z, value: z })),
  ];

  const tableRows = (rules as Rule[]).map((rule) => [
    <InlineStack gap="200" blockAlign="center" key={`name-${rule.id}`}>
      <Text as="span" fontWeight="bold">
        {rule.name}
      </Text>
      <Badge tone={rule.isActive ? "success" : undefined}>
        {rule.isActive ? "Active" : "Inactive"}
      </Badge>
    </InlineStack>,
    rule.zone || "All",
    rule.deliveryFee != null ? `$${rule.deliveryFee.toFixed(2)}` : "Free",
    rule.minOrderAmount != null ? `$${rule.minOrderAmount.toFixed(2)}` : "—",
    rule.estimatedDays || "—",
    rule.daysOfWeek || "All days",
    <InlineStack gap="200" key={`actions-${rule.id}`}>
      <Tooltip content={rule.isActive ? "Click to deactivate" : "Click to activate"}>
        <Button
          variant="plain"
          tone={rule.isActive ? "success" : undefined}
          onClick={() => handleToggle(rule.id, rule.isActive)}
          accessibilityLabel={rule.isActive ? "Deactivate rule" : "Activate rule"}
        >
          {rule.isActive ? "Active" : "Inactive"}
        </Button>
      </Tooltip>
      <Tooltip content="Edit rule">
        <Button
          size="slim"
          variant="tertiary"
          onClick={() => openEdit(rule)}
          icon={EditIcon}
          accessibilityLabel="Edit"
        />
      </Tooltip>
      <Tooltip content="Delete rule">
        <Button
          size="slim"
          variant="tertiary"
          tone="critical"
          onClick={() => handleDelete(rule.id)}
          icon={DeleteIcon}
          accessibilityLabel="Delete"
        />
      </Tooltip>
    </InlineStack>,
  ]);

  return (
    <Page
      title="Delivery Rules"
      subtitle="Configure delivery fees, minimums, schedules, and conditions per zone"
      backAction={{ onAction: () => navigate("/app") }}
      primaryAction={
        isFreePlan
          ? undefined
          : {
              content: "Add Rule",
              icon: PlusIcon,
              onAction: openCreate,
            }
      }
    >
      <Box paddingBlockEnd="1600">
      <Layout>
        {isFreePlan && (
          <Layout.Section>
            <Banner
              tone="info"
              title="Delivery rules require a paid plan"
              action={{
                content: "View pricing plans",
                url: "/app/pricing",
              }}
            >
              <p>
                Upgrade to the Starter plan or higher to create delivery rules
                with custom fees, schedules, and zone conditions.
              </p>
            </Banner>
          </Layout.Section>
        )}
        {hasFiniteLimit && (
          <Layout.Section>
            <InlineStack align="end">
              <Badge
                tone={
                  (rules as Rule[]).length >= limits.maxDeliveryRules
                    ? "warning"
                    : undefined
                }
              >
                {`${(rules as Rule[]).length}/${limits.maxDeliveryRules} rules used`}
              </Badge>
            </InlineStack>
          </Layout.Section>
        )}
        <Layout.Section>
          <Card padding="0">
            {(rules as Rule[]).length === 0 ? (
              <EmptyState
                heading="No delivery rules yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                action={{
                  content: "Create your first rule",
                  onAction: openCreate,
                }}
              >
                <p>
                  Delivery rules let you set fees, minimum order amounts,
                  estimated delivery times, and delivery schedules for different
                  zones. Rules are evaluated by priority order.
                </p>
              </EmptyState>
            ) : (
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                ]}
                headings={[
                  "Rule Name",
                  "Zone",
                  "Delivery Fee",
                  "Min. Order",
                  "ETA",
                  "Days",
                  "Actions",
                ]}
                rows={tableRows}
                hoverable
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
      </Box>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingRule ? "Edit Delivery Rule" : "Create Delivery Rule"}
        primaryAction={{
          content: editingRule ? "Save Changes" : "Create Rule",
          onAction: handleSave,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => {
              setModalOpen(false);
              resetForm();
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {actionError && <Banner tone="critical">{actionError}</Banner>}

            <TextField
              label="Rule Name"
              value={name}
              onChange={setName}
              placeholder="e.g. Manhattan Standard Delivery"
              autoComplete="off"
              helpText="A descriptive name for this delivery rule."
            />

            <InlineStack gap="300">
              <div style={{ flex: 1 }}>
                <Select
                  label="Zone"
                  options={zoneOptions}
                  value={zone}
                  onChange={setZone}
                  helpText="Apply this rule to a specific zone, or all zones."
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Priority"
                  type="number"
                  value={priority}
                  onChange={setPriority}
                  autoComplete="off"
                  helpText="Lower number = higher priority."
                />
              </div>
            </InlineStack>

            <TextField
              label="Specific Zip Codes (optional)"
              value={zipCodes}
              onChange={setZipCodes}
              placeholder="10001, 10002, 10003"
              autoComplete="off"
              helpText="Comma-separated zip codes. Leave empty to apply to all zip codes in the zone."
            />

            <Divider />
            <Text as="h3" variant="headingSm">
              Pricing
            </Text>

            <InlineStack gap="300">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Delivery Fee ($)"
                  type="number"
                  value={deliveryFee}
                  onChange={setDeliveryFee}
                  placeholder="0.00"
                  autoComplete="off"
                  helpText="Leave empty for free delivery."
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Min. Order Amount ($)"
                  type="number"
                  value={minOrderAmount}
                  onChange={setMinOrderAmount}
                  placeholder="0.00"
                  autoComplete="off"
                  helpText="Minimum order to qualify for delivery."
                />
              </div>
            </InlineStack>

            <TextField
              label="Free Shipping Above ($)"
              type="number"
              value={freeShippingAbove}
              onChange={setFreeShippingAbove}
              placeholder="e.g. 50.00"
              autoComplete="off"
              helpText="Waive the delivery fee for orders above this amount."
            />

            <Divider />
            <Text as="h3" variant="headingSm">
              Schedule
            </Text>

            <InlineStack gap="300">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Estimated Delivery"
                  value={estimatedDays}
                  onChange={setEstimatedDays}
                  placeholder="e.g. 2-3 days"
                  autoComplete="off"
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Order Cutoff Time"
                  value={cutoffTime}
                  onChange={setCutoffTime}
                  placeholder="e.g. 14:00"
                  autoComplete="off"
                  helpText="Orders after this time ship next delivery day."
                />
              </div>
            </InlineStack>

            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                Delivery Days
              </Text>
              <InlineStack gap="300" wrap>
                {DAYS_OPTIONS.map((day) => (
                  <Checkbox
                    key={day.value}
                    label={day.label}
                    checked={selectedDays.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                ))}
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
