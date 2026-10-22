CREATE TABLE "SearchAllowance" (
    "provider" TEXT NOT NULL PRIMARY KEY,
    "limit" INTEGER NOT NULL CHECK ("limit" >= 0),
    "used" INTEGER NOT NULL DEFAULT 0 CHECK ("used" >= 0),
    "hourlyLimit" INTEGER NOT NULL CHECK ("hourlyLimit" >= 0),
    "expiresAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "SearchReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "SearchReservation_provider_createdAt_idx" ON "SearchReservation"("provider", "createdAt");
CREATE INDEX "SearchReservation_provider_requestKey_blockedUntil_idx" ON "SearchReservation"("provider", "requestKey", "blockedUntil");

-- An operator must explicitly allocate a budget before searches can run.
INSERT INTO "SearchAllowance" ("provider", "limit", "hourlyLimit", "expiresAt")
VALUES ('serpapi', 0, 0, CURRENT_TIMESTAMP);
