ALTER TABLE "ClothingItem" ADD COLUMN "recognition" JSONB;
ALTER TABLE "ClothingItem" ADD COLUMN "labelsConfirmedAt" DATETIME;
CREATE TABLE "AnalysisJob" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "uploadId" TEXT NOT NULL,
 "source" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'queued', "error" TEXT, "analysisId" TEXT,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
 CONSTRAINT "AnalysisJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "AnalysisJob_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnalysisJob_userId_uploadId_key" ON "AnalysisJob"("userId", "uploadId");
CREATE INDEX "AnalysisJob_status_createdAt_idx" ON "AnalysisJob"("status", "createdAt");
CREATE TABLE "TrainingExample" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "itemId" TEXT NOT NULL, "labels" JSONB NOT NULL,
 "confirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "TrainingExample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "TrainingExample_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ClothingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrainingExample_itemId_key" ON "TrainingExample"("itemId");
CREATE INDEX "TrainingExample_userId_idx" ON "TrainingExample"("userId");
