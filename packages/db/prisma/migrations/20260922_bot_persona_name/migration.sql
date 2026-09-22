-- Add personaName to bots table
-- This is the short customer-facing first name shown in the chat widget greeting
-- e.g. Bot.name = "Salon Booking Bot v2", Bot.personaName = "Bella"
ALTER TABLE bots ADD COLUMN IF NOT EXISTS "personaName" TEXT;
