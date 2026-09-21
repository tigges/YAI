-- Add subject/body columns to campaigns
ALTER TABLE "campaigns"
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "body" TEXT;

-- Create campaign_deliveries table
CREATE TABLE IF NOT EXISTS "campaign_deliveries" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "tenantId"   TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "contactId"  TEXT NOT NULL,
  "email"      TEXT,
  "status"     TEXT NOT NULL DEFAULT 'pending',
  "sentAt"     TIMESTAMP(3),
  "error"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_deliveries_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE,
  CONSTRAINT "campaign_deliveries_campaignId_contactId_key"
    UNIQUE ("campaignId", "contactId")
);
