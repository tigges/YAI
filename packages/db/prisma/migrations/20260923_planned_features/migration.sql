-- Tickets can exist without a conversation, and they can store a description.
ALTER TABLE "tickets" ALTER COLUMN "conversationId" DROP NOT NULL;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "description" TEXT;

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL DEFAULT 0,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhookId_createdAt_idx" ON "webhook_deliveries"("webhookId", "createdAt");

ALTER TABLE "webhook_deliveries" DROP CONSTRAINT IF EXISTS "webhook_deliveries_webhookId_fkey";
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "canned_replies" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shortcut" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "canned_replies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "canned_replies_tenantId_shortcut_key" ON "canned_replies"("tenantId", "shortcut");
ALTER TABLE "canned_replies" DROP CONSTRAINT IF EXISTS "canned_replies_tenantId_fkey";
ALTER TABLE "canned_replies" ADD CONSTRAINT "canned_replies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "data_tables" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "columns" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "data_tables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "data_tables_tenantId_name_key" ON "data_tables"("tenantId", "name");
ALTER TABLE "data_tables" DROP CONSTRAINT IF EXISTS "data_tables_tenantId_fkey";
ALTER TABLE "data_tables" ADD CONSTRAINT "data_tables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "data_records" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "data_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_records_tableId_idx" ON "data_records"("tableId");
ALTER TABLE "data_records" DROP CONSTRAINT IF EXISTS "data_records_tableId_fkey";
ALTER TABLE "data_records" ADD CONSTRAINT "data_records_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "data_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "integration_connections" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "apiKey" TEXT,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_connections_tenantId_provider_key" ON "integration_connections"("tenantId", "provider");
ALTER TABLE "integration_connections" DROP CONSTRAINT IF EXISTS "integration_connections_tenantId_fkey";
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
