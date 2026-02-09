-- ============================================================================
-- Create a SECURITY DEFINER function to join groups
-- ============================================================================
-- This bypasses RLS so users can lookup groups by code to join them

CREATE OR REPLACE FUNCTION join_group_by_code(
    p_group_code text
)
RETURNS TABLE (
    id uuid,
    creator_id uuid,
    name text,
    code text,
    description text,
    created_at timestamptz,
    updated_at timestamptz,
    approved boolean,
    approved_at timestamptz,
    approved_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_group_id uuid;
    v_creator_id uuid;
    v_approved boolean;
    v_existing_member record;
BEGIN
    -- Get the authenticated user
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find the group by code (case-insensitive)
    SELECT g.id, g.creator_id, g.approved
    INTO v_group_id, v_creator_id, v_approved
    FROM groups g
    WHERE UPPER(g.code) = UPPER(p_group_code);

    -- Check if group exists
    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Group does not exist';
    END IF;

    -- Check if user is the creator/owner
    IF v_creator_id = v_user_id THEN
        RAISE EXCEPTION 'You are the owner of this group and already a member';
    END IF;

    -- Check if group is approved (hide unapproved groups from non-owners)
    IF NOT v_approved THEN
        RAISE EXCEPTION 'Group does not exist';
    END IF;

    -- Check if already a member
    SELECT id, role INTO v_existing_member
    FROM group_members
    WHERE group_id = v_group_id
      AND user_id = v_user_id;

    IF FOUND THEN
        RAISE EXCEPTION 'You are already a % of this group', v_existing_member.role;
    END IF;

    -- Add user as member
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_group_id, v_user_id, 'member');

    -- Return the group details
    RETURN QUERY
    SELECT
        g.id,
        g.creator_id,
        g.name,
        g.code,
        g.description,
        g.created_at,
        g.updated_at,
        g.approved,
        g.approved_at,
        g.approved_by
    FROM groups g
    WHERE g.id = v_group_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION join_group_by_code(text) TO authenticated;

COMMENT ON FUNCTION join_group_by_code IS
'Allows authenticated users to join a group by code. Uses SECURITY DEFINER to bypass RLS for group lookup.';
