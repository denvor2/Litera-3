-- AlterTable: projects
ALTER TABLE "projects" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "synopsis" TEXT;

-- CreateIndex: user_preferences
CREATE UNIQUE INDEX "user_preferences_sessionId_key" ON "user_preferences"("sessionId");
