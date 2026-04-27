-- Add proper menu item variants for drink sizes and other selectable prices.
CREATE TABLE "MenuItemVariant" (
  "id" UUID NOT NULL,
  "menuItemId" UUID NOT NULL,
  "labelDe" TEXT NOT NULL,
  "labelFa" TEXT,
  "labelEn" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "MenuItemVariant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MenuItemVariant_menuItemId_idx" ON "MenuItemVariant"("menuItemId");

ALTER TABLE "MenuItemVariant"
  ADD CONSTRAINT "MenuItemVariant_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD COLUMN "variantId" UUID,
  ADD COLUMN "variantLabel" TEXT;

CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "MenuItemVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
