CREATE TABLE "DestinationCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wikidataId" TEXT NOT NULL UNIQUE,
    "wikivoyagePageId" INTEGER NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL CHECK ("latitude" BETWEEN -90 AND 90),
    "longitude" DOUBLE PRECISION NOT NULL CHECK ("longitude" BETWEEN -180 AND 180),
    "sourceUrl" TEXT NOT NULL,
    "sourceRevisionId" INTEGER NOT NULL,
    "guideStatus" TEXT NOT NULL CHECK ("guideStatus" IN ('usable', 'guide', 'star')),
    "importedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "DestinationCandidate_countryCode_idx" ON "DestinationCandidate"("countryCode");
