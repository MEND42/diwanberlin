-- Add stable per-table public tokens for QR waiter-call links.
ALTER TABLE "Table" ADD COLUMN "qrToken" TEXT;

UPDATE "Table"
SET "qrToken" = md5(random()::text || clock_timestamp()::text || "id"::text)
WHERE "qrToken" IS NULL;

ALTER TABLE "Table" ALTER COLUMN "qrToken" SET NOT NULL;

CREATE UNIQUE INDEX "Table_qrToken_key" ON "Table"("qrToken");
