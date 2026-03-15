-- CreateTable
CREATE TABLE "DeliveryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT,
    "zipCodes" TEXT,
    "minOrderAmount" REAL,
    "deliveryFee" REAL,
    "freeShippingAbove" REAL,
    "estimatedDays" TEXT,
    "cutoffTime" TEXT,
    "daysOfWeek" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WidgetConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'inline',
    "primaryColor" TEXT NOT NULL DEFAULT '#008060',
    "successColor" TEXT NOT NULL DEFAULT '#008060',
    "errorColor" TEXT NOT NULL DEFAULT '#D72C0D',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "textColor" TEXT NOT NULL DEFAULT '#202223',
    "heading" TEXT NOT NULL DEFAULT 'Check Delivery Availability',
    "placeholder" TEXT NOT NULL DEFAULT 'Enter your zip code',
    "buttonText" TEXT NOT NULL DEFAULT 'Check',
    "successMessage" TEXT NOT NULL DEFAULT 'Great news! We deliver to your area.',
    "errorMessage" TEXT NOT NULL DEFAULT 'Sorry, we don''t deliver to this area yet.',
    "notFoundMessage" TEXT NOT NULL DEFAULT 'This zip code was not found in our system.',
    "showEta" BOOLEAN NOT NULL DEFAULT true,
    "showZone" BOOLEAN NOT NULL DEFAULT false,
    "showWaitlistOnFailure" BOOLEAN NOT NULL DEFAULT false,
    "borderRadius" TEXT NOT NULL DEFAULT '8',
    "customCss" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DeliveryRule_shop_idx" ON "DeliveryRule"("shop");

-- CreateIndex
CREATE INDEX "WaitlistEntry_shop_idx" ON "WaitlistEntry"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_shop_email_zipCode_key" ON "WaitlistEntry"("shop", "email", "zipCode");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetConfig_shop_key" ON "WidgetConfig"("shop");
