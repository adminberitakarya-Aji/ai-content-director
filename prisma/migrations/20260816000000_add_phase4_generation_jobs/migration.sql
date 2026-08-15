-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "adapterName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "promptConceptual" TEXT NOT NULL,
    "promptFinal" TEXT,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "bibleVersions" JSONB NOT NULL,
    "costEstimate" DOUBLE PRECISION NOT NULL,
    "costActual" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "outputAssetUrl" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdapterPricingRate" (
    "id" TEXT NOT NULL,
    "adapterName" TEXT NOT NULL,
    "generationType" TEXT NOT NULL,
    "rateStructure" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdapterPricingRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_idx" ON "GenerationJob"("projectId");

-- CreateIndex
CREATE INDEX "GenerationJob_shotId_idx" ON "GenerationJob"("shotId");

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_status_idx" ON "GenerationJob"("projectId", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_adapterName_idx" ON "GenerationJob"("adapterName");

-- CreateIndex
CREATE INDEX "AdapterPricingRate_adapterName_generationType_idx" ON "AdapterPricingRate"("adapterName", "generationType");

-- CreateIndex
CREATE INDEX "AdapterPricingRate_isActive_idx" ON "AdapterPricingRate"("isActive");

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;