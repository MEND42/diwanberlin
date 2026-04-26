-- MenuItem: add English name and description fields
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;

-- SiteContentBlock: add English value field
ALTER TABLE "SiteContentBlock" ADD COLUMN IF NOT EXISTS "valueEn" TEXT;

-- SiteSettings: new table for global key/value settings
CREATE TABLE IF NOT EXISTS "SiteSettings" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "key"        TEXT         NOT NULL,
    "value"      TEXT         NOT NULL,
    "valueDe"    TEXT,
    "valueFa"    TEXT,
    "valueEn"    TEXT,
    "type"       TEXT         NOT NULL DEFAULT 'STRING',
    "category"   TEXT         NOT NULL DEFAULT 'general',
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteSettings_key_key" ON "SiteSettings"("key");
