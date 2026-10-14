-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OutfitAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "imageHash" TEXT,
    "canonicalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutfitAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutfitAnalysis_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutfitAnalysis_canonicalId_fkey" FOREIGN KEY ("canonicalId") REFERENCES "OutfitAnalysis" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
INSERT INTO "new_OutfitAnalysis" ("createdAt", "id", "model", "result", "uploadId", "userId") SELECT "createdAt", "id", "model", "result", "uploadId", "userId" FROM "OutfitAnalysis";
DROP TABLE "OutfitAnalysis";
ALTER TABLE "new_OutfitAnalysis" RENAME TO "OutfitAnalysis";
CREATE UNIQUE INDEX "OutfitAnalysis_uploadId_key" ON "OutfitAnalysis"("uploadId");
CREATE INDEX "OutfitAnalysis_userId_idx" ON "OutfitAnalysis"("userId");
CREATE UNIQUE INDEX "OutfitAnalysis_userId_imageHash_key" ON "OutfitAnalysis"("userId", "imageHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
