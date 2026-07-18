/*
  Warnings:

  - You are about to drop the `NailIncomeEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NailTransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- DropTable
DROP TABLE "NailIncomeEntry";

-- CreateTable
CREATE TABLE "NailTransaction" (
    "id" TEXT NOT NULL,
    "type" "NailTransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "clientName" TEXT,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whatsappFrom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NailTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NailTransaction_date_idx" ON "NailTransaction"("date");

-- CreateIndex
CREATE INDEX "NailTransaction_type_idx" ON "NailTransaction"("type");
