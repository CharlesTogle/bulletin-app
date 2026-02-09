-- ============================================================================
-- FIX 1: Fix ambiguous column reference in join function
-- ============================================================================

DROP FUNCTION IF EXISTS join_group_by_code(text);

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
    v_existing_role text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Find group by code
    SELECT g.id, g.creator_id, g.approved
    INTO v_group_id, v_creator_id, v_approved
    FROM groups g
    WHERE UPPER(g.code) = UPPER(p_group_code);

    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Group does not exist';
    END IF;

    IF v_creator_id = v_user_id THEN
        RAISE EXCEPTION 'You are the owner of this group and already a member';
    END IF;

    IF NOT v_approved THEN
        RAISE EXCEPTION 'Group does not exist';
    END IF;

    -- Check if already a member (fixed ambiguous column)
    SELECT gm.role INTO v_existing_role
    FROM group_members gm
    WHERE gm.group_id = v_group_id AND gm.user_id = v_user_id;

    IF FOUND THEN
        RAISE EXCEPTION 'You are already a % of this group', v_existing_role;
    END IF;

    -- Add user as member
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_group_id, v_user_id, 'member');

    -- Return the group details
    RETURN QUERY
    SELECT g.id, g.creator_id, g.name, g.code, g.description,
           g.created_at, g.updated_at, g.approved, g.approved_at, g.approved_by
    FROM groups g
    WHERE g.id = v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION join_group_by_code(text) TO authenticated;

-- ============================================================================
-- FIX 2: Add rejected_at column for tracking rejections without deletion
-- ============================================================================

-- Add rejected_at column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add index for rejected groups
CREATE INDEX IF NOT EXISTS idx_groups_rejected_at ON groups(rejected_at);

COMMENT ON COLUMN groups.rejected_at IS 'When the group was rejected by a system admin (if rejected)';
COMMENT ON COLUMN groups.rejected_by IS 'Which system admin rejected the group';
