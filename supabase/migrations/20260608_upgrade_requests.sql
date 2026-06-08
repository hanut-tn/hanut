CREATE TABLE IF NOT EXISTS upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  current_plan TEXT NOT NULL,
  requested_plan TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'activated', 'cancelled')) DEFAULT 'pending',
  whatsapp_opened_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upgrade_requests_seller ON upgrade_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_status ON upgrade_requests(status);

ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upgrade_requests_select" ON upgrade_requests;
DROP POLICY IF EXISTS "upgrade_requests_insert" ON upgrade_requests;

CREATE POLICY "upgrade_requests_select" ON upgrade_requests
  FOR SELECT USING (
    seller_id = auth.uid()
  );

CREATE POLICY "upgrade_requests_insert" ON upgrade_requests
  FOR INSERT WITH CHECK (
    seller_id = auth.uid()
  );
