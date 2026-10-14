-- CreateTable
CREATE TABLE "WardrobePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'photo',
    "importedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WardrobePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WardrobePhoto_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClothingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "seasons" JSONB NOT NULL,
    "occasions" JSONB NOT NULL,
    "gender" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "fit" TEXT NOT NULL,
    "formalityScore" INTEGER NOT NULL,
    "trendScore" INTEGER NOT NULL,
    "comfortScore" INTEGER NOT NULL,
    "versatilityScore" INTEGER NOT NULL,
    "sustainabilityScore" INTEGER NOT NULL,
    "wearCount" INTEGER NOT NULL DEFAULT 0,
    "lastWornAt" DATETIME,
    "imageUrl" TEXT,
    "photoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClothingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClothingItem_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "WardrobePhoto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClothingItem" ("category", "color", "colorHex", "comfortScore", "createdAt", "fit", "formalityScore", "gender", "id", "imageUrl", "lastWornAt", "material", "name", "occasions", "pattern", "seasons", "style", "subcategory", "sustainabilityScore", "trendScore", "updatedAt", "userId", "versatilityScore", "wearCount") SELECT "category", "color", "colorHex", "comfortScore", "createdAt", "fit", "formalityScore", "gender", "id", "imageUrl", "lastWornAt", "material", "name", "occasions", "pattern", "seasons", "style", "subcategory", "sustainabilityScore", "trendScore", "updatedAt", "userId", "versatilityScore", "wearCount" FROM "ClothingItem";
DROP TABLE "ClothingItem";
ALTER TABLE "new_ClothingItem" RENAME TO "ClothingItem";
CREATE INDEX "ClothingItem_userId_idx" ON "ClothingItem"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WardrobePhoto_uploadId_key" ON "WardrobePhoto"("uploadId");

-- CreateIndex
CREATE INDEX "WardrobePhoto_userId_idx" ON "WardrobePhoto"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WardrobePhoto_userId_imageHash_key" ON "WardrobePhoto"("userId", "imageHash");
