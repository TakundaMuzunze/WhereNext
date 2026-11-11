ALTER TABLE "SearchReservation" ADD COLUMN "background" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "SearchReservation_provider_background_createdAt_idx" ON "SearchReservation" ("provider", "background", "createdAt");

CREATE TABLE "ActivityEnrichmentAttempt" (
  "requestKey" TEXT NOT NULL PRIMARY KEY,
  "attemptedAt" TIMESTAMP(3) NOT NULL
);
