-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'FROZEN', 'PENDING');

-- CreateEnum
CREATE TYPE "FontCategory" AS ENUM ('SERIF', 'SANS_SERIF', 'SCRIPT', 'SIGNATURE', 'HANDWRITTEN', 'BLOCK', 'VARSITY', 'MONOGRAM');

-- CreateEnum
CREATE TYPE "PersonalizationType" AS ENUM ('STANDARD_TEXT', 'SINGLE_INITIAL', 'TWO_INITIALS', 'THREE_INITIALS', 'BASIC_MONOGRAM', 'NUMBER', 'NAME_AND_DATE');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PersonalizationEffect" AS ENUM ('PRINT', 'ENGRAVING', 'EMBROIDERY', 'FOIL', 'DEBOSS', 'EMBOSS');

-- CreateEnum
CREATE TYPE "FieldInputType" AS ENUM ('TEXT', 'NUMBER', 'DATE');

-- CreateEnum
CREATE TYPE "AllowedCharacters" AS ENUM ('LETTERS_ONLY', 'NUMBERS_ONLY', 'LETTERS_AND_NUMBERS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TextTransform" AS ENUM ('NONE', 'UPPERCASE', 'LOWERCASE');

-- CreateEnum
CREATE TYPE "ZoneAlignment" AS ENUM ('LEFT', 'CENTER', 'RIGHT');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('MANUAL', 'COLLECTION', 'TAG', 'PRODUCT_TYPE');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NEW', 'PROCESSING', 'FULFILLED');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('CUSTOMIZER_VIEWED', 'CUSTOMIZER_STARTED', 'PERSONALIZATION_COMPLETED', 'PERSONALIZED_ADD_TO_CART', 'PERSONALIZED_ORDER', 'FONT_SELECTED', 'COLOR_SELECTED', 'TEMPLATE_USED', 'PRODUCT_PERSONALIZED');

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "shopifyShopId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifySubscriptionId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "brandingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "useThemeStyling" BOOLEAN NOT NULL DEFAULT true,
    "widgetConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Font" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "category" "FontCategory" NOT NULL,
    "family" TEXT NOT NULL,
    "fileUrl" TEXT,
    "format" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Font_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColorPalette" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColorPalette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaletteColor" (
    "id" TEXT NOT NULL,
    "paletteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaletteColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalizationTemplate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PersonalizationType" NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "effect" "PersonalizationEffect" NOT NULL DEFAULT 'PRINT',
    "defaultFontId" TEXT,
    "confirmationRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalizationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalizationField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "inputType" "FieldInputType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "allowedCharacters" "AllowedCharacters" NOT NULL DEFAULT 'LETTERS_AND_NUMBERS',
    "customAllowedPattern" TEXT,
    "transform" "TextTransform" NOT NULL DEFAULT 'NONE',
    "disallowLeadingSpaces" BOOLEAN NOT NULL DEFAULT true,
    "disallowTrailingSpaces" BOOLEAN NOT NULL DEFAULT true,
    "collapseDuplicateSpaces" BOOLEAN NOT NULL DEFAULT true,
    "disableEmoji" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalizationField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviewZone" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alignment" "ZoneAlignment" NOT NULL DEFAULT 'CENTER',
    "textAlign" "ZoneAlignment" NOT NULL DEFAULT 'CENTER',
    "minFontSize" DOUBLE PRECISION NOT NULL,
    "maxFontSize" DOUBLE PRECISION NOT NULL,
    "defaultFontSize" DOUBLE PRECISION NOT NULL,
    "autoFit" BOOLEAN NOT NULL DEFAULT true,
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "effect" "PersonalizationEffect",
    "mobileOverride" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreviewZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantPreviewRule" (
    "id" TEXT NOT NULL,
    "previewZoneId" TEXT NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "previewImageUrl" TEXT,
    "geometryOverride" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantPreviewRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAssignment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "assignmentSource" "AssignmentSource" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customization" (
    "id" TEXT NOT NULL,
    "internalRef" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "templateId" TEXT,
    "templateNameSnapshot" TEXT NOT NULL,
    "fieldValues" JSONB NOT NULL,
    "displayText" TEXT NOT NULL,
    "fontId" TEXT,
    "fontNameSnapshot" TEXT,
    "colorId" TEXT,
    "colorNameSnapshot" TEXT,
    "colorHexSnapshot" TEXT,
    "effect" "PersonalizationEffect" NOT NULL,
    "placement" JSONB NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "shopifyCartToken" TEXT,
    "shopifyLineItemId" TEXT,
    "shopifyOrderId" TEXT,
    "shopifyOrderName" TEXT,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviewSnapshot" (
    "id" TEXT NOT NULL,
    "publicRef" TEXT NOT NULL,
    "customizationId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "productImageUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT,
    "templateId" TEXT,
    "fontId" TEXT,
    "colorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TemplateAllowedFonts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TemplateAllowedFonts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TemplateAllowedPalettes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TemplateAllowedPalettes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_VariantAllowedColors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VariantAllowedColors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopifyShopId_key" ON "Shop"("shopifyShopId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shopId_key" ON "Subscription"("shopId");

-- CreateIndex
CREATE INDEX "Subscription_shopId_idx" ON "Subscription"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shopId_key" ON "AppSettings"("shopId");

-- CreateIndex
CREATE INDEX "Font_shopId_idx" ON "Font"("shopId");

-- CreateIndex
CREATE INDEX "Font_isSystem_idx" ON "Font"("isSystem");

-- CreateIndex
CREATE INDEX "ColorPalette_shopId_idx" ON "ColorPalette"("shopId");

-- CreateIndex
CREATE INDEX "ColorPalette_isSystem_idx" ON "ColorPalette"("isSystem");

-- CreateIndex
CREATE INDEX "PaletteColor_paletteId_idx" ON "PaletteColor"("paletteId");

-- CreateIndex
CREATE INDEX "PersonalizationTemplate_shopId_idx" ON "PersonalizationTemplate"("shopId");

-- CreateIndex
CREATE INDEX "PersonalizationField_templateId_idx" ON "PersonalizationField"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalizationField_templateId_key_key" ON "PersonalizationField"("templateId", "key");

-- CreateIndex
CREATE INDEX "PreviewZone_templateId_idx" ON "PreviewZone"("templateId");

-- CreateIndex
CREATE INDEX "PreviewZone_shopifyProductId_idx" ON "PreviewZone"("shopifyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "PreviewZone_templateId_shopifyProductId_key" ON "PreviewZone"("templateId", "shopifyProductId");

-- CreateIndex
CREATE INDEX "VariantPreviewRule_previewZoneId_idx" ON "VariantPreviewRule"("previewZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantPreviewRule_previewZoneId_shopifyVariantId_key" ON "VariantPreviewRule"("previewZoneId", "shopifyVariantId");

-- CreateIndex
CREATE INDEX "ProductAssignment_shopId_idx" ON "ProductAssignment"("shopId");

-- CreateIndex
CREATE INDEX "ProductAssignment_templateId_idx" ON "ProductAssignment"("templateId");

-- CreateIndex
CREATE INDEX "ProductAssignment_shopId_enabled_idx" ON "ProductAssignment"("shopId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAssignment_shopId_shopifyProductId_key" ON "ProductAssignment"("shopId", "shopifyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Customization_internalRef_key" ON "Customization"("internalRef");

-- CreateIndex
CREATE INDEX "Customization_shopId_idx" ON "Customization"("shopId");

-- CreateIndex
CREATE INDEX "Customization_shopifyOrderId_idx" ON "Customization"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "Customization_shopId_fulfillmentStatus_idx" ON "Customization"("shopId", "fulfillmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PreviewSnapshot_publicRef_key" ON "PreviewSnapshot"("publicRef");

-- CreateIndex
CREATE UNIQUE INDEX "PreviewSnapshot_customizationId_key" ON "PreviewSnapshot"("customizationId");

-- CreateIndex
CREATE INDEX "PreviewSnapshot_customizationId_idx" ON "PreviewSnapshot"("customizationId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shopId_type_createdAt_idx" ON "AnalyticsEvent"("shopId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shopId_createdAt_idx" ON "AnalyticsEvent"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "_TemplateAllowedFonts_B_index" ON "_TemplateAllowedFonts"("B");

-- CreateIndex
CREATE INDEX "_TemplateAllowedPalettes_B_index" ON "_TemplateAllowedPalettes"("B");

-- CreateIndex
CREATE INDEX "_VariantAllowedColors_B_index" ON "_VariantAllowedColors"("B");

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Font" ADD CONSTRAINT "Font_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColorPalette" ADD CONSTRAINT "ColorPalette_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaletteColor" ADD CONSTRAINT "PaletteColor_paletteId_fkey" FOREIGN KEY ("paletteId") REFERENCES "ColorPalette"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalizationTemplate" ADD CONSTRAINT "PersonalizationTemplate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalizationTemplate" ADD CONSTRAINT "PersonalizationTemplate_defaultFontId_fkey" FOREIGN KEY ("defaultFontId") REFERENCES "Font"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalizationField" ADD CONSTRAINT "PersonalizationField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PersonalizationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewZone" ADD CONSTRAINT "PreviewZone_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PersonalizationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantPreviewRule" ADD CONSTRAINT "VariantPreviewRule_previewZoneId_fkey" FOREIGN KEY ("previewZoneId") REFERENCES "PreviewZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAssignment" ADD CONSTRAINT "ProductAssignment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAssignment" ADD CONSTRAINT "ProductAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PersonalizationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customization" ADD CONSTRAINT "Customization_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customization" ADD CONSTRAINT "Customization_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PersonalizationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customization" ADD CONSTRAINT "Customization_fontId_fkey" FOREIGN KEY ("fontId") REFERENCES "Font"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customization" ADD CONSTRAINT "Customization_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "PaletteColor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewSnapshot" ADD CONSTRAINT "PreviewSnapshot_customizationId_fkey" FOREIGN KEY ("customizationId") REFERENCES "Customization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PersonalizationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_fontId_fkey" FOREIGN KEY ("fontId") REFERENCES "Font"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "PaletteColor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TemplateAllowedFonts" ADD CONSTRAINT "_TemplateAllowedFonts_A_fkey" FOREIGN KEY ("A") REFERENCES "Font"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TemplateAllowedFonts" ADD CONSTRAINT "_TemplateAllowedFonts_B_fkey" FOREIGN KEY ("B") REFERENCES "PersonalizationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TemplateAllowedPalettes" ADD CONSTRAINT "_TemplateAllowedPalettes_A_fkey" FOREIGN KEY ("A") REFERENCES "ColorPalette"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TemplateAllowedPalettes" ADD CONSTRAINT "_TemplateAllowedPalettes_B_fkey" FOREIGN KEY ("B") REFERENCES "PersonalizationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VariantAllowedColors" ADD CONSTRAINT "_VariantAllowedColors_A_fkey" FOREIGN KEY ("A") REFERENCES "PaletteColor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VariantAllowedColors" ADD CONSTRAINT "_VariantAllowedColors_B_fkey" FOREIGN KEY ("B") REFERENCES "VariantPreviewRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
