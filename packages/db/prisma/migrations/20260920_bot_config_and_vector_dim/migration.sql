-- Migration: bot_configs table + fix vector(1536) dimension
-- Run against the YBot PostgreSQL database.
-- Safe to run multiple times (idempotent).

-- ── 1. bot_configs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "bot_configs" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT         NOT NULL,
  "botId"        TEXT         NOT NULL,
  "model"        TEXT         NOT NULL DEFAULT 'claude-sonnet-4-5',
  "temperature"  FLOAT8       NOT NULL DEFAULT 0.3,
  "maxTokens"    INTEGER      NOT NULL DEFAULT 2048,
  "systemPrompt" TEXT         NOT NULL DEFAULT 'You are a helpful assistant.',
  "updatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE ("botId"),
  CONSTRAINT "bot_configs_botId_fkey"
    FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE
);

-- ── 2. pgvector dimension fix ─────────────────────────────────────────────────
-- text-embedding-3-small → 1536 dims
-- Only alter if the column exists without a dimension (i.e. type = 'USER-DEFINED' / 'vector')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_chunks'
      AND column_name = 'embedding'
  ) THEN
    -- Cast to text first, then to vector(1536) to handle untyped vector columns
    ALTER TABLE "document_chunks"
      ALTER COLUMN "embedding" TYPE vector(1536)
      USING CASE
        WHEN "embedding" IS NULL THEN NULL
        ELSE "embedding"::text::vector(1536)
      END;
  END IF;
END $$;
