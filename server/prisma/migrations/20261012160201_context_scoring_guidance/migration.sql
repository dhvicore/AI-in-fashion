-- CreateTable
CREATE TABLE "GuidanceSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "checkedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ClothingGuide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sourceIds" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "OutfitAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "garments" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutfitAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutfitAssessment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "OutfitAnalysis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClothingGuide_version_kind_key_key" ON "ClothingGuide"("version", "kind", "key");

-- CreateIndex
CREATE INDEX "OutfitAssessment_userId_createdAt_idx" ON "OutfitAssessment"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutfitAssessment_userId_fingerprint_key" ON "OutfitAssessment"("userId", "fingerprint");
