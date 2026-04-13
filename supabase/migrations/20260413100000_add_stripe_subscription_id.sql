-- Add stripe_subscription_id column for webhook subscription lookups
-- stripe_customer_id already exists (renamed from lemon_squeezy_id)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;
