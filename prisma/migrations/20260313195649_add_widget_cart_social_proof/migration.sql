-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WidgetConfig" (
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
    "showCod" BOOLEAN NOT NULL DEFAULT true,
    "showReturnPolicy" BOOLEAN NOT NULL DEFAULT true,
    "showCutoffTime" BOOLEAN NOT NULL DEFAULT true,
    "showDeliveryDays" BOOLEAN NOT NULL DEFAULT true,
    "blockCartOnInvalid" BOOLEAN NOT NULL DEFAULT false,
    "blockCheckoutInCart" BOOLEAN NOT NULL DEFAULT false,
    "showSocialProof" BOOLEAN NOT NULL DEFAULT true,
    "borderRadius" TEXT NOT NULL DEFAULT '8',
    "customCss" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_WidgetConfig" ("backgroundColor", "borderRadius", "buttonText", "createdAt", "customCss", "errorColor", "errorMessage", "heading", "id", "notFoundMessage", "placeholder", "position", "primaryColor", "shop", "showCod", "showEta", "showReturnPolicy", "showWaitlistOnFailure", "showZone", "successColor", "successMessage", "textColor", "updatedAt") SELECT "backgroundColor", "borderRadius", "buttonText", "createdAt", "customCss", "errorColor", "errorMessage", "heading", "id", "notFoundMessage", "placeholder", "position", "primaryColor", "shop", "showCod", "showEta", "showReturnPolicy", "showWaitlistOnFailure", "showZone", "successColor", "successMessage", "textColor", "updatedAt" FROM "WidgetConfig";
DROP TABLE "WidgetConfig";
ALTER TABLE "new_WidgetConfig" RENAME TO "WidgetConfig";
CREATE UNIQUE INDEX "WidgetConfig_shop_key" ON "WidgetConfig"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
