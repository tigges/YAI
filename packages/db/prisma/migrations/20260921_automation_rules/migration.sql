CREATE TABLE IF NOT EXISTS automation_rules (
  id          TEXT NOT NULL PRIMARY KEY,
  "tenantId"  TEXT NOT NULL,
  "botId"     TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  trigger     TEXT NOT NULL,
  conditions  TEXT NOT NULL DEFAULT '',
  actions     JSONB NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'draft',
  "runCount"  INTEGER NOT NULL DEFAULT 0,
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_rules_botId_fkey" FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "automation_rules_botId_idx" ON automation_rules("botId");
CREATE INDEX IF NOT EXISTS "automation_rules_tenantId_idx" ON automation_rules("tenantId");
