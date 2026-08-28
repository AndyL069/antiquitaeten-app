-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "author" TEXT,
ADD COLUMN     "buyItNowPrice" DOUBLE PRECISION,
ADD COLUMN     "ebayCategory" TEXT,
ADD COLUMN     "ebayCondition" TEXT,
ADD COLUMN     "ebayConditionNote" TEXT,
ADD COLUMN     "ebayTitle" TEXT,
ADD COLUMN     "edition" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "publicationYear" TEXT,
ADD COLUMN     "publisher" TEXT,
ADD COLUMN     "startPrice" DOUBLE PRECISION,
ADD COLUMN     "weight" TEXT;
