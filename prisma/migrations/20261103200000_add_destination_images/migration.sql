CREATE TABLE "DestinationImage" (
  "destinationId" TEXT NOT NULL,
  "image" JSONB NOT NULL,
  "retrievedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DestinationImage_pkey" PRIMARY KEY ("destinationId"),
  CONSTRAINT "DestinationImage_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "DestinationCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
