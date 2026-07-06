-- AlterTable
ALTER TABLE "streams" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "thumbnailMediaId" TEXT;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_thumbnailMediaId_fkey" FOREIGN KEY ("thumbnailMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
