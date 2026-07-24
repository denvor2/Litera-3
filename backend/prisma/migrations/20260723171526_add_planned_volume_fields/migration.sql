/*
  Warnings:

  - You are about to drop the column `series` on the `books` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "books" DROP COLUMN "series",
ADD COLUMN     "plannedAuthorSheets" INTEGER,
ADD COLUMN     "plannedCharCount" INTEGER,
ADD COLUMN     "isInSeries" BOOLEAN NOT NULL DEFAULT true;
