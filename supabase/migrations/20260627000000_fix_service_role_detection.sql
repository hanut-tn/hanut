-- Supabase/PostgREST compatibility for service_role detection.
--
-- Recent local Supabase versions expose the JWT role through auth.role() and
-- request.jwt.claims. Older Hanut RPCs only inspect request.jwt.claim.role.
-- Centralizing the check here keeps every guarded RPC compatible with both.

CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    auth.role(),
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (
      CASE
        WHEN NULLIF(current_setting('request.jwt.claims', true), '') IS NOT NULL
          THEN current_setting('request.jwt.claims', true)::jsonb ->> 'role'
        ELSE NULL
      END
    ),
    ''
  ) = 'service_role';
$$;

REVOKE ALL ON FUNCTION is_service_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_service_role() TO authenticated, service_role;

-- service_role is the trusted server context and may operate for any seller.
-- Normal users keep the existing owner/team lookup.
CREATE OR REPLACE FUNCTION get_team_role(p_seller_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN is_service_role() THEN 'admin'
    WHEN p_seller_id = auth.uid() THEN 'admin'
    ELSE (
      SELECT role
      FROM team_members
      WHERE seller_id = p_seller_id
        AND user_id = auth.uid()
        AND status = 'active'
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION can_write_seller(p_seller_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    is_service_role()
    OR get_team_role(p_seller_id) IN ('admin', 'operator'),
    false
  );
$$;

REVOKE ALL ON FUNCTION get_team_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_write_seller(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_team_role(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_write_seller(UUID) TO authenticated, service_role;
