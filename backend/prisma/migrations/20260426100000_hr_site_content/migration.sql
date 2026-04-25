CREATE TABLE "StaffProfile" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "position" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffAvailability" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAvailability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShiftAssignment" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeEntry" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteContentBlock" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "valueDe" TEXT,
    "valueFa" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContentBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffProfile_adminUserId_key" ON "StaffProfile"("adminUserId");
CREATE UNIQUE INDEX "SiteContentBlock_key_key" ON "SiteContentBlock"("key");

ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "StaffAvailability_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SiteContentBlock" ("id", "key", "label", "type", "valueDe", "valueFa", "isPublished", "updatedAt")
VALUES
  ('5ac7013a-212b-4f2e-8812-984286440001', 'heroSub', 'Hero Untertitel', 'TEXTAREA', 'Ein Kulturcafé im Herzen Berlins — wo warme Gastfreundschaft auf echte Kaffeekultur trifft.', 'کافه‌ای فرهنگی در قلب برلین؛ جایی برای مهمان‌نوازی گرم و فرهنگ قهوه.', true, CURRENT_TIMESTAMP),
  ('5ac7013a-212b-4f2e-8812-984286440002', 'aboutIntro', 'Über uns kurzer Text', 'TEXTAREA', 'Cafe Diwan ist ein warmer, ruhiger Ort im Herzen Berlins. Wir servieren heiße und kalte Getränke, Frühstück, kleine Speisen und schaffen Raum für Gespräch, Kunst und Kultur.', 'کافه دیوان مکانی گرم و آرام در قلب برلین است؛ جایی برای نوشیدنی، صبحانه، خوراکی‌های سبک، گفتگو، هنر و فرهنگ.', true, CURRENT_TIMESTAMP),
  ('5ac7013a-212b-4f2e-8812-984286440003', 'announcement', 'Homepage Hinweis', 'TEXTAREA', '', '', false, CURRENT_TIMESTAMP);
