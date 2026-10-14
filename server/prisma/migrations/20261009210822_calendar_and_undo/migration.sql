-- AlterTable
ALTER TABLE "ClothingItem" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "WardrobePhoto" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "OutfitDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "wornAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutfitDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OutfitDay_userId_date_key" ON "OutfitDay"("userId", "date");
