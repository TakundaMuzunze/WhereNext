CREATE TABLE "SeasonalClimate" (
    "requestKey" TEXT NOT NULL,
    "observation" JSONB NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeasonalClimate_pkey" PRIMARY KEY ("requestKey")
);
