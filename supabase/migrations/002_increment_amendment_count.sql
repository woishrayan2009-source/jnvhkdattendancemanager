-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Add increment_amendment_count RPC function
-- Required by attendance.js amendRecord() — replaces the broken
-- supabase.rpc('increment') Promise-as-value pattern.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_amendment_count(session_id_arg UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE attendance_sessions
  SET    amendment_count = COALESCE(amendment_count, 0) + 1,
         updated_at      = NOW()
  WHERE  id = session_id_arg;
END;
$$;

-- Grant execute to authenticated users (staff members)
GRANT EXECUTE ON FUNCTION increment_amendment_count(UUID) TO authenticated;
