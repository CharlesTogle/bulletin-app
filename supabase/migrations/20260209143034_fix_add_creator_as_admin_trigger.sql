-- ============================================================================
-- FIX: Make add_creator_as_admin function bypass RLS
-- ============================================================================
-- The trigger was failing because RLS policies on group_members require
-- the user to already be an admin to add admins - chicken and egg problem!
-- Solution: Make the function SECURITY DEFINER to bypass RLS

CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER
SECURITY DEFINER  -- This bypasses RLS policies
SET search_path = public
AS $$
BEGIN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'admin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining why SECURITY DEFINER is needed
COMMENT ON FUNCTION add_creator_as_admin() IS
'Automatically adds group creator as admin. Uses SECURITY DEFINER to bypass RLS policies that would otherwise create a circular dependency.';
