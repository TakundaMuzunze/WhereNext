-- Keep schema creation and the existing-save copy atomic.
BEGIN;

-- CreateTable
CREATE TABLE "ShortlistItem" (
    "id" TEXT NOT NULL,
    "shortlistId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,

    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shortlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shortlistName" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistItem_shortlistId_destinationId_key" ON "ShortlistItem"("shortlistId", "destinationId");

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "Shortlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create a case-insensitive composite unique index
CREATE UNIQUE INDEX shortlist_user_id_name_lower_idx
ON "Shortlist" ("userId", LOWER("shortlistName"));

-- Prevent saves changing between the two copy statements. Reads remain available.
LOCK TABLE "SavedDestination" IN SHARE MODE;

-- Create one collection for each owner who already has saved destinations.
-- Raw SQL supplies IDs explicitly: Prisma's cuid() default runs in Prisma Client.
INSERT INTO "Shortlist" ("id", "userId", "shortlistName")
SELECT DISTINCT
    'migrated-shortlist-' || "userId",
    "userId",
    'Saved places'
FROM "SavedDestination";

-- Each old save becomes a membership in its owner's new collection.
-- Reusing its ID is safe because the old and new records live in different tables.
INSERT INTO "ShortlistItem" ("id", "shortlistId", "destinationId")
SELECT
    "id",
    'migrated-shortlist-' || "userId",
    "destinationId"
FROM "SavedDestination";

-- Leave SavedDestination intact while the existing application still uses it.
COMMIT;
