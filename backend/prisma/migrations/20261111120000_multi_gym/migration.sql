-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "ClientTrainer" ADD COLUMN     "assignedBy" TEXT NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "assignedById" UUID;

-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "TrainerGym" (
    "id" UUID NOT NULL,
    "trainerId" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerGym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientGym" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientGym_pkey" PRIMARY KEY ("id")
);

-- Backfill memberships from existing client-trainer links
INSERT INTO "TrainerGym" ("id", "trainerId", "gymId", "isActive", "createdAt")
SELECT gen_random_uuid(), "trainerId", "gymId", true, CURRENT_TIMESTAMP
FROM "ClientTrainer"
WHERE "isActive" = true
GROUP BY "trainerId", "gymId";

INSERT INTO "ClientGym" ("id", "clientId", "gymId", "isActive", "createdAt")
SELECT gen_random_uuid(), "clientId", "gymId", true, CURRENT_TIMESTAMP
FROM "ClientTrainer"
WHERE "isActive" = true
GROUP BY "clientId", "gymId";

-- Deduplicate links before adding the unique constraint
DELETE FROM "ClientTrainer" a
USING "ClientTrainer" b
WHERE a."clientId" = b."clientId"
  AND a."trainerId" = b."trainerId"
  AND a."gymId" = b."gymId"
  AND a."id" > b."id";

-- CreateIndex
CREATE INDEX "TrainerGym_gymId_isActive_idx" ON "TrainerGym"("gymId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerGym_trainerId_gymId_key" ON "TrainerGym"("trainerId", "gymId");

-- CreateIndex
CREATE INDEX "ClientGym_gymId_isActive_idx" ON "ClientGym"("gymId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClientGym_clientId_gymId_key" ON "ClientGym"("clientId", "gymId");

-- CreateIndex
CREATE INDEX "ClientTrainer_trainerId_isActive_idx" ON "ClientTrainer"("trainerId", "isActive");

-- CreateIndex
CREATE INDEX "ClientTrainer_clientId_isActive_idx" ON "ClientTrainer"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTrainer_clientId_trainerId_gymId_key" ON "ClientTrainer"("clientId", "trainerId", "gymId");

-- AddForeignKey
ALTER TABLE "TrainerGym" ADD CONSTRAINT "TrainerGym_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerGym" ADD CONSTRAINT "TrainerGym_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGym" ADD CONSTRAINT "ClientGym_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGym" ADD CONSTRAINT "ClientGym_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
