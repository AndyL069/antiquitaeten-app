-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "soldAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_itemId_idx" ON "Sale"("itemId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
