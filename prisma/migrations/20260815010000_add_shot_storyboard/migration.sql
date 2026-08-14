-- CreateTable
CREATE TABLE "Shot" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shotNumber" INTEGER NOT NULL,
    "shotType" TEXT NOT NULL,
    "framing" TEXT NOT NULL,
    "composition" TEXT NOT NULL,
    "cameraPosition" TEXT NOT NULL,
    "lens" TEXT,
    "cameraMovement" TEXT,
    "characterBlocking" JSONB,
    "visualBeat" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ContinuityFlag" ADD COLUMN "shotId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shot_sceneId_shotNumber_key" ON "Shot"("sceneId", "shotNumber");

-- CreateIndex
CREATE INDEX "Shot_sceneId_idx" ON "Shot"("sceneId");

-- CreateIndex
CREATE INDEX "Shot_projectId_idx" ON "Shot"("projectId");

-- CreateIndex
CREATE INDEX "ContinuityFlag_shotId_idx" ON "ContinuityFlag"("shotId");

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContinuityFlag" ADD CONSTRAINT "ContinuityFlag_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;