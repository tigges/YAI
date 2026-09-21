-- Migration: CSAT responses + conversation templates + optimization proposals
-- Idempotent (safe to run multiple times)

-- ── 1. csat_responses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "csat_responses" (
  "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"       TEXT         NOT NULL,
  "conversationId" TEXT         NOT NULL,
  "messageId"      TEXT,
  "rating"         INTEGER      NOT NULL,
  "comment"        TEXT,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "csat_responses_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE
);

-- ── 2. conversation_templates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "conversation_templates" (
  "id"                   TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"             TEXT         NOT NULL,
  "botId"                TEXT         NOT NULL,
  "name"                 TEXT         NOT NULL,
  "description"          TEXT,
  "sampleConversationId" TEXT,
  "clusterKeywords"      TEXT[]       NOT NULL DEFAULT '{}',
  "avgQualityScore"      FLOAT8       NOT NULL DEFAULT 0,
  "useCount"             INTEGER      NOT NULL DEFAULT 0,
  "status"               TEXT         NOT NULL DEFAULT 'active',
  "createdAt"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "conversation_templates_botId_fkey"
    FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE
);

-- ── 3. template_optimizations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "template_optimizations" (
  "id"              TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT         NOT NULL,
  "botId"           TEXT         NOT NULL,
  "templateId"      TEXT,
  "kind"            TEXT         NOT NULL DEFAULT 'system_prompt',
  "title"           TEXT         NOT NULL,
  "description"     TEXT         NOT NULL DEFAULT '',
  "currentValue"    TEXT,
  "proposedValue"   TEXT         NOT NULL DEFAULT '',
  "evidenceCount"   INTEGER      NOT NULL DEFAULT 1,
  "avgQualityScore" FLOAT8       NOT NULL DEFAULT 0,
  "status"          TEXT         NOT NULL DEFAULT 'pending',
  "appliedAt"       TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "template_optimizations_botId_fkey"
    FOREIGN KEY ("botId") REFERENCES "bots"("id") ON DELETE CASCADE,
  CONSTRAINT "template_optimizations_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "conversation_templates"("id") ON DELETE SET NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_csat_responses_conversation"
  ON "csat_responses" ("conversationId");
CREATE INDEX IF NOT EXISTS "idx_csat_responses_tenant"
  ON "csat_responses" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_template_optimizations_bot_status"
  ON "template_optimizations" ("botId", "status");
CREATE INDEX IF NOT EXISTS "idx_conversation_templates_bot"
  ON "conversation_templates" ("botId");
