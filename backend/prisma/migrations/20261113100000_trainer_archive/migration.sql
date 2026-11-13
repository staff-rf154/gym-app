ALTER TABLE "Trainer"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "archivedAt" TIMESTAMPTZ(6);

CREATE INDEX "Trainer_isActive_idx" ON "Trainer"("isActive");
