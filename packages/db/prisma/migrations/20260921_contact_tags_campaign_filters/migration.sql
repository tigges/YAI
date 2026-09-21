-- Add tags array to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Add filters JSON to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS filters JSONB NOT NULL DEFAULT '{}';
