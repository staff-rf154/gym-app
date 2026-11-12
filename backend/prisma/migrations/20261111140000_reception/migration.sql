-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RECEPTION';

-- CreateTable
CREATE TABLE "Reception" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reception_userId_key" ON "Reception"("userId");

-- CreateIndex
CREATE INDEX "Reception_gymId_idx" ON "Reception"("gymId");

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
