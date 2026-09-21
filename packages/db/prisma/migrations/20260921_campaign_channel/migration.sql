-- Migration: add channel column to campaigns table
-- Idempotent (safe to run multiple times)

ALTER TABLE "campaigns"
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'email';
