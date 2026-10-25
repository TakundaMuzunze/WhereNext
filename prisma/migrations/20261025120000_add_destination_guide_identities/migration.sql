CREATE TABLE "DestinationGuideIdentity" (
    "wikidataId" TEXT NOT NULL PRIMARY KEY CHECK ("wikidataId" ~ '^Q[1-9][0-9]*$'),
    "legacyDestinationId" TEXT NOT NULL CHECK (length("legacyDestinationId") > 0)
);

CREATE INDEX "DestinationGuideIdentity_legacyDestinationId_idx"
ON "DestinationGuideIdentity"("legacyDestinationId");

-- One-time compatibility links for the existing guides, not a new destination list.
-- Verified on 25 October 2026 using Wikivoyage pageprops and Wikidata entity descriptions.
-- Sources: https://en.wikivoyage.org/w/api.php and https://www.wikidata.org/w/api.php
-- Regional/island identities are linked exactly; cities inside them remain separate.
INSERT INTO "DestinationGuideIdentity" ("wikidataId", "legacyDestinationId")
VALUES
    ('Q597', 'lisbon-portugal'),
    ('Q31487', 'krakow-poland'),
    ('Q1492', 'barcelona-spain'),
    ('Q1663', 'split-croatia'),
    ('Q26831', 'algarve-portugal'),
    ('Q129296', 'santorini-greece'),
    ('Q101625', 'marrakech-morocco'),
    ('Q1764', 'reykjavik-iceland'),
    ('Q1781', 'budapest-hungary'),
    ('Q212214', 'amalfi-coast-italy'),
    ('Q40846', 'tenerife-spain'),
    ('Q64', 'berlin-germany');
