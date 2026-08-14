-- CreateTable
CREATE TABLE "CharacterBible" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "age" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "identityDesc" TEXT NOT NULL,
    "faceShape" TEXT NOT NULL,
    "eyeColor" TEXT NOT NULL,
    "skinColor" TEXT NOT NULL,
    "distinctiveFeatures" TEXT,
    "defaultExpression" TEXT NOT NULL,
    "height" TEXT NOT NULL,
    "build" TEXT NOT NULL,
    "posture" TEXT,
    "hairColor" TEXT NOT NULL,
    "hairLength" TEXT NOT NULL,
    "hairTexture" TEXT NOT NULL,
    "hairDefaultStyle" TEXT NOT NULL,
    "personality" JSONB,
    "wardrobes" JSONB NOT NULL,
    "referenceImages" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isMinorRevision" BOOLEAN NOT NULL DEFAULT false,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterBible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationBible" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "exterior" JSONB,
    "interior" JSONB,
    "architecture" JSONB,
    "lighting" JSONB NOT NULL,
    "atmosphere" TEXT NOT NULL,
    "referenceImages" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isMinorRevision" BOOLEAN NOT NULL DEFAULT false,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationBible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropBible" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "appearance" JSONB NOT NULL,
    "function" TEXT NOT NULL,
    "continuity" JSONB NOT NULL,
    "referenceImages" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isMinorRevision" BOOLEAN NOT NULL DEFAULT false,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropBible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleBible" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "visualStyle" TEXT NOT NULL,
    "colorPalette" TEXT NOT NULL,
    "colorSaturation" TEXT NOT NULL,
    "colorContrast" TEXT NOT NULL,
    "lightingApproach" TEXT NOT NULL,
    "lightingTendency" TEXT NOT NULL,
    "texture" TEXT,
    "framingPreference" TEXT NOT NULL,
    "lensPreference" TEXT,
    "cameraMovementTendency" TEXT NOT NULL,
    "motionStyle" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isMinorRevision" BOOLEAN NOT NULL DEFAULT false,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleBible_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterBible_previousVersionId_key" ON "CharacterBible"("previousVersionId");

-- CreateIndex
CREATE INDEX "CharacterBible_projectId_characterId_idx" ON "CharacterBible"("projectId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterBible_projectId_characterId_version_key" ON "CharacterBible"("projectId", "characterId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "LocationBible_previousVersionId_key" ON "LocationBible"("previousVersionId");

-- CreateIndex
CREATE INDEX "LocationBible_projectId_locationId_idx" ON "LocationBible"("projectId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationBible_projectId_locationId_version_key" ON "LocationBible"("projectId", "locationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PropBible_previousVersionId_key" ON "PropBible"("previousVersionId");

-- CreateIndex
CREATE INDEX "PropBible_projectId_propId_idx" ON "PropBible"("projectId", "propId");

-- CreateIndex
CREATE UNIQUE INDEX "PropBible_projectId_propId_version_key" ON "PropBible"("projectId", "propId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "StyleBible_previousVersionId_key" ON "StyleBible"("previousVersionId");

-- CreateIndex
CREATE INDEX "StyleBible_projectId_idx" ON "StyleBible"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StyleBible_projectId_version_key" ON "StyleBible"("projectId", "version");

-- AddForeignKey
ALTER TABLE "CharacterBible" ADD CONSTRAINT "CharacterBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterBible" ADD CONSTRAINT "CharacterBible_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "CharacterBible"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationBible" ADD CONSTRAINT "LocationBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationBible" ADD CONSTRAINT "LocationBible_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "LocationBible"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropBible" ADD CONSTRAINT "PropBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropBible" ADD CONSTRAINT "PropBible_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "PropBible"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleBible" ADD CONSTRAINT "StyleBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleBible" ADD CONSTRAINT "StyleBible_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "StyleBible"("id") ON DELETE SET NULL ON UPDATE CASCADE;
