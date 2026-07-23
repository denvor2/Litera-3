-- CreateTable
CREATE TABLE "ai_roles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🤖',
    "systemPrompt" TEXT NOT NULL,
    "quickPrompts" TEXT[],
    "model" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_field_prompts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "quickPrompts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_field_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "aiPanelWidth" INTEGER NOT NULL DEFAULT 280,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_roles_projectId_idx" ON "ai_roles"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_roles_projectId_name_key" ON "ai_roles"("projectId", "name");

-- CreateIndex
CREATE INDEX "ai_field_prompts_projectId_idx" ON "ai_field_prompts"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_field_prompts_projectId_scope_key" ON "ai_field_prompts"("projectId", "scope");

-- AddForeignKey
ALTER TABLE "ai_roles" ADD CONSTRAINT "ai_roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_field_prompts" ADD CONSTRAINT "ai_field_prompts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
