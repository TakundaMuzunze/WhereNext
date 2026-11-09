CREATE TABLE "CatalogueRefresh" (
    "countryCode" VARCHAR(2) NOT NULL,
    "cursor" TEXT,
    "cycleStartedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatalogueRefresh_pkey" PRIMARY KEY ("countryCode")
);
