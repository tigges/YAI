-- SLA clocks and one-time out-of-hours notice on conversations
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "firstResponseDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolutionDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "firstRespondedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "afterHoursNotifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaBreachedAt" TIMESTAMP(3);
