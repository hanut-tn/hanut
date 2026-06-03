ALTER TABLE sellers ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS onboarding_steps JSONB NOT NULL DEFAULT '{"product_added": false, "link_copied": false, "first_order": false}'::jsonb;
