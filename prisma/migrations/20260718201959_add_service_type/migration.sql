-- CreateEnum
CREATE TYPE "NailServiceType" AS ENUM ('ESMALTADO_PERMANENTE', 'GEL_X', 'KAPPING');

-- AlterTable
ALTER TABLE "NailTransaction" ADD COLUMN     "serviceType" "NailServiceType";

-- CreateIndex
CREATE INDEX "NailTransaction_serviceType_idx" ON "NailTransaction"("serviceType");
