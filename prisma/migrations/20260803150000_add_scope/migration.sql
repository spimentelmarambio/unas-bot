-- CreateEnum
CREATE TYPE "NailScope" AS ENUM ('BUSINESS', 'PERSONAL');

-- AlterTable
-- Existing rows are all business (that's all the bot could log until now),
-- which is exactly what the default backfills them with.
ALTER TABLE "NailTransaction" ADD COLUMN     "scope" "NailScope" NOT NULL DEFAULT 'BUSINESS';

-- CreateIndex
CREATE INDEX "NailTransaction_scope_idx" ON "NailTransaction"("scope");
