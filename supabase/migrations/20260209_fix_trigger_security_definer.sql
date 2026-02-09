-- ============================================================================
-- FIX: Ensure add_creator_as_admin trigger has SECURITY DEFINER
-- ============================================================================
-- The trigger function must bypass RLS policies to add the first admin
-- to a newly created group (chicken-and-egg problem)

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS add_creator_as_admin_trigger ON groups;
DROP FUNCTION IF EXISTS add_creator_as_admin();

-- Recreate function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER
SECURITY DEFINER  -- This allows the function to bypass RLS policies
SET search_path = public  -- Security: Prevent search_path attacks
LANGUAGE plpgsql
AS $$
BEGIN
    -- Add the creator as an admin of the newly created group
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'admin');

    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER add_creator_as_admin_trigger
    AFTER INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION add_creator_as_admin();

-- Grant execute permission to authenticated users (needed for SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION add_creator_as_admin() TO authenticated;

-- Add comment
COMMENT ON FUNCTION add_creator_as_admin() IS
'Automatically adds the creator as an admin when a new group is created. Uses SECURITY DEFINER to bypass RLS policies.';
