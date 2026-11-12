-- CreateTable
CREATE TABLE "Goal" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Goal_name_key" ON "Goal"("name");

-- CreateIndex
CREATE INDEX "Goal_isActive_sortOrder_idx" ON "Goal"("isActive", "sortOrder");

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "goalId" UUID;

-- CreateIndex
CREATE INDEX "Client_goalId_idx" ON "Client"("goalId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill base goals
INSERT INTO "Goal" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'Похудение', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Тонус', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Набор массы', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Backfill custom goals from existing client records
INSERT INTO "Goal" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), btrim("goal"), true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Client"
WHERE "goal" IS NOT NULL AND btrim("goal") <> ''
GROUP BY btrim("goal")
ON CONFLICT ("name") DO NOTHING;

-- Link clients to matching goals
UPDATE "Client" AS c
SET "goalId" = g."id"
FROM "Goal" AS g
WHERE c."goal" IS NOT NULL
  AND lower(btrim(c."goal")) = lower(g."name");
