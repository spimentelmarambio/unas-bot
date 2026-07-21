-- AlterTable
ALTER TABLE "NailTransaction" ADD COLUMN     "whatsappMessageId" TEXT;

-- CreateIndex
CREATE INDEX "NailTransaction_whatsappMessageId_idx" ON "NailTransaction"("whatsappMessageId");
