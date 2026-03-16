-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "WidgetConfig" ALTER COLUMN "notFoundMessage" SET DEFAULT 'We currently do not ship to this ZIP code.';
