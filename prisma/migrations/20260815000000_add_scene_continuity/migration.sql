-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT,
    "sceneNumber" INTEGER NOT NULL,
    "title" TEXT,
    "characterIds" JSONB NOT NULL,
    "locationId" TEXT NOT NULL,
    "propIds" JSONB,
    "time" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "emotions" JSONB NOT NULL,
    "dialogues" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContinuityFlag" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "expectedValue" TEXT NOT NULL,
    "actualValue" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unresolved',
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContinuityFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scene_projectId_idx" ON "Scene"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_projectId_sceneNumber_key" ON "Scene"("projectId", "sceneNumber");

-- CreateIndex
CREATE INDEX "ContinuityFlag_sceneId_idx" ON "ContinuityFlag"("sceneId");

-- CreateIndex
CREATE INDEX "ContinuityFlag_projectId_status_idx" ON "ContinuityFlag"("projectId", "status");

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContinuityFlag" ADD CONSTRAINT "ContinuityFlag_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
