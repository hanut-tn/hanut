CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier
  ON rate_limits(identifier, endpoint);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- Aucune policy publique — accès service role uniquement

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_in INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_requests INTEGER;
  v_window INTERVAL;
  v_reset_in INTEGER;
BEGIN
  IF p_identifier IS NULL OR btrim(p_identifier) = '' THEN
    RAISE EXCEPTION 'Rate limit identifier is required';
  END IF;

  IF p_endpoint IS NULL OR btrim(p_endpoint) = '' THEN
    RAISE EXCEPTION 'Rate limit endpoint is required';
  END IF;

  IF p_max_requests < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Rate limit config is invalid';
  END IF;

  v_window := p_window_seconds * INTERVAL '1 second';

  DELETE FROM rate_limits
  WHERE window_start < v_now - INTERVAL '24 hours';

  INSERT INTO rate_limits(identifier, endpoint, requests, window_start)
  VALUES (p_identifier, p_endpoint, 0, v_now)
  ON CONFLICT (identifier, endpoint) DO NOTHING;

  SELECT requests, window_start
  INTO v_requests, v_window_start
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
  FOR UPDATE;

  IF v_window_start <= v_now - v_window THEN
    UPDATE rate_limits
    SET requests = 1,
        window_start = v_now
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint;

    RETURN QUERY SELECT true, GREATEST(p_max_requests - 1, 0), p_window_seconds;
    RETURN;
  END IF;

  v_reset_in := GREATEST(
    0,
    CEIL(EXTRACT(EPOCH FROM (v_window_start + v_window - v_now)))::INTEGER
  );

  IF v_requests >= p_max_requests THEN
    RETURN QUERY SELECT false, 0, v_reset_in;
    RETURN;
  END IF;

  v_requests := v_requests + 1;

  UPDATE rate_limits
  SET requests = v_requests
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint;

  RETURN QUERY SELECT true, GREATEST(p_max_requests - v_requests, 0), v_reset_in;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
