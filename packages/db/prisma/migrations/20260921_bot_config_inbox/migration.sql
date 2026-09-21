-- Migration: add inboxConfig column to bot_configs table
ALTER TABLE "bot_configs"
  ADD COLUMN IF NOT EXISTS "inboxConfig" JSONB NOT NULL DEFAULT '{}';
