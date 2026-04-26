ALTER TABLE "EventListing" ADD COLUMN "descriptionFull" TEXT;
ALTER TABLE "EventListing" ADD COLUMN "descriptionFa" TEXT;
ALTER TABLE "EventListing" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "EventListing" ADD COLUMN "location" TEXT;
ALTER TABLE "EventListing" ADD COLUMN "price" DECIMAL(10,2);
ALTER TABLE "EventListing" ADD COLUMN "maxAttendees" INTEGER;
ALTER TABLE "EventListing" ADD COLUMN "registrationOpen" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EventRegistration" (
    "id" UUID NOT NULL,
    "eventListingId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventListingId_fkey"
FOREIGN KEY ("eventListingId") REFERENCES "EventListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "EventRegistration_eventListingId_idx" ON "EventRegistration"("eventListingId");
