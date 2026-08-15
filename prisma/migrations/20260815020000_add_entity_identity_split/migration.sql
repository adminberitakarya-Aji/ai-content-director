-- ===== Refactor: Character/Location/Prop sebagai identitas stabil =====
-- Tujuan: memberi Scene referensi FK sungguhan ke Character/Location/Prop,
-- tanpa mengubah characterIds/locationId/propIds sebagai sumber kebenaran
-- untuk logic bisnis (validasi, continuity check).

-- 1. Buat tabel identity
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Prop" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Character_projectId_characterId_key" ON "Character"("projectId", "characterId");
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");

CREATE UNIQUE INDEX "Location_projectId_locationId_key" ON "Location"("projectId", "locationId");
CREATE INDEX "Location_projectId_idx" ON "Location"("projectId");

CREATE UNIQUE INDEX "Prop_projectId_propId_key" ON "Prop"("projectId", "propId");
CREATE INDEX "Prop_projectId_idx" ON "Prop"("projectId");

ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prop" ADD CONSTRAINT "Prop_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill: satu row Character/Location/Prop untuk tiap business ID unik
--    yang sudah ada di data Bible lama.
INSERT INTO "Character" ("id", "projectId", "characterId", "createdAt")
SELECT gen_random_uuid()::text, "projectId", "characterId", MIN("createdAt")
FROM "CharacterBible"
GROUP BY "projectId", "characterId";

INSERT INTO "Location" ("id", "projectId", "locationId", "createdAt")
SELECT gen_random_uuid()::text, "projectId", "locationId", MIN("createdAt")
FROM "LocationBible"
GROUP BY "projectId", "locationId";

INSERT INTO "Prop" ("id", "projectId", "propId", "createdAt")
SELECT gen_random_uuid()::text, "projectId", "propId", MIN("createdAt")
FROM "PropBible"
GROUP BY "projectId", "propId";

-- 3. Tambah kolom FK di *Bible (nullable dulu), backfill, baru NOT NULL.
ALTER TABLE "CharacterBible" ADD COLUMN "characterEntityId" TEXT;
UPDATE "CharacterBible" cb
SET "characterEntityId" = c."id"
FROM "Character" c
WHERE c."projectId" = cb."projectId" AND c."characterId" = cb."characterId";
ALTER TABLE "CharacterBible" ALTER COLUMN "characterEntityId" SET NOT NULL;
CREATE INDEX "CharacterBible_characterEntityId_idx" ON "CharacterBible"("characterEntityId");
ALTER TABLE "CharacterBible" ADD CONSTRAINT "CharacterBible_characterEntityId_fkey" FOREIGN KEY ("characterEntityId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LocationBible" ADD COLUMN "locationEntityId" TEXT;
UPDATE "LocationBible" lb
SET "locationEntityId" = l."id"
FROM "Location" l
WHERE l."projectId" = lb."projectId" AND l."locationId" = lb."locationId";
ALTER TABLE "LocationBible" ALTER COLUMN "locationEntityId" SET NOT NULL;
CREATE INDEX "LocationBible_locationEntityId_idx" ON "LocationBible"("locationEntityId");
ALTER TABLE "LocationBible" ADD CONSTRAINT "LocationBible_locationEntityId_fkey" FOREIGN KEY ("locationEntityId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropBible" ADD COLUMN "propEntityId" TEXT;
UPDATE "PropBible" pb
SET "propEntityId" = p."id"
FROM "Prop" p
WHERE p."projectId" = pb."projectId" AND p."propId" = pb."propId";
ALTER TABLE "PropBible" ALTER COLUMN "propEntityId" SET NOT NULL;
CREATE INDEX "PropBible_propEntityId_idx" ON "PropBible"("propEntityId");
ALTER TABLE "PropBible" ADD CONSTRAINT "PropBible_propEntityId_fkey" FOREIGN KEY ("propEntityId") REFERENCES "Prop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Scene.locationEntityId — kolom baru (nullable, karena Scene lama
--    mungkin merujuk locationId yang belum sempat backfill sempurna).
ALTER TABLE "Scene" ADD COLUMN "locationEntityId" TEXT;
UPDATE "Scene" s
SET "locationEntityId" = l."id"
FROM "Location" l
WHERE l."projectId" = s."projectId" AND l."locationId" = s."locationId";
CREATE INDEX "Scene_locationEntityId_idx" ON "Scene"("locationEntityId");
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_locationEntityId_fkey" FOREIGN KEY ("locationEntityId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Join table SceneCharacter — backfill dari Scene.characterIds (Json array).
CREATE TABLE "SceneCharacter" (
    "sceneId" TEXT NOT NULL,
    "characterEntityId" TEXT NOT NULL,
    CONSTRAINT "SceneCharacter_pkey" PRIMARY KEY ("sceneId", "characterEntityId")
);
CREATE INDEX "SceneCharacter_characterEntityId_idx" ON "SceneCharacter"("characterEntityId");
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_characterEntityId_fkey" FOREIGN KEY ("characterEntityId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "SceneCharacter" ("sceneId", "characterEntityId")
SELECT DISTINCT s."id", c."id"
FROM "Scene" s
CROSS JOIN LATERAL jsonb_array_elements_text(s."characterIds"::jsonb) AS elem(characterId)
JOIN "Character" c ON c."projectId" = s."projectId" AND c."characterId" = elem.characterId
ON CONFLICT DO NOTHING;

-- 6. Join table SceneProp — backfill dari Scene.propIds (Json array, nullable).
CREATE TABLE "SceneProp" (
    "sceneId" TEXT NOT NULL,
    "propEntityId" TEXT NOT NULL,
    CONSTRAINT "SceneProp_pkey" PRIMARY KEY ("sceneId", "propEntityId")
);
CREATE INDEX "SceneProp_propEntityId_idx" ON "SceneProp"("propEntityId");
ALTER TABLE "SceneProp" ADD CONSTRAINT "SceneProp_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceneProp" ADD CONSTRAINT "SceneProp_propEntityId_fkey" FOREIGN KEY ("propEntityId") REFERENCES "Prop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "SceneProp" ("sceneId", "propEntityId")
SELECT DISTINCT s."id", p."id"
FROM "Scene" s
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(s."propIds", '[]'::jsonb)::jsonb) AS elem(propId)
JOIN "Prop" p ON p."projectId" = s."projectId" AND p."propId" = elem.propId
ON CONFLICT DO NOTHING;

-- 7. Composite index tambahan di ContinuityFlag untuk query resolved(accepted)
--    (dipakai fix bug "flag accepted muncul lagi jadi unresolved").
CREATE INDEX "ContinuityFlag_sceneId_status_idx" ON "ContinuityFlag"("sceneId", "status");
CREATE INDEX "ContinuityFlag_shotId_status_idx" ON "ContinuityFlag"("shotId", "status");