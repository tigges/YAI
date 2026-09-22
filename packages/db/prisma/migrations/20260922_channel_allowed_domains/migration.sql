-- AlterTable
ALTER TABLE "channels" ADD COLUMN "allowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
