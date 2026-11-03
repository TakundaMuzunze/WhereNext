CREATE TABLE "DestinationActivityEvidence" (
    "requestKey" TEXT NOT NULL PRIMARY KEY,
    "destinationId" TEXT NOT NULL,
    "observation" JSONB NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "DestinationActivityEvidence_destinationId_idx"
ON "DestinationActivityEvidence"("destinationId");

CREATE INDEX "DestinationActivityEvidence_expiresAt_idx"
ON "DestinationActivityEvidence"("expiresAt");
