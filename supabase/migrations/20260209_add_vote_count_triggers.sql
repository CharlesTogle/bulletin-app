-- ============================================================================
-- Add triggers to keep vote counts in sync
-- ============================================================================
-- This ensures vote counts are updated atomically at the database level,
-- preventing race conditions when multiple users vote simultaneously

-- ============================================================================
-- Function to update announcement vote counts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_announcement_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_announcement_id uuid;
    v_upvotes integer;
    v_downvotes integer;
BEGIN
    -- Determine which announcement_id to update
    IF TG_OP = 'DELETE' THEN
        v_announcement_id := OLD.announcement_id;
    ELSE
        v_announcement_id := NEW.announcement_id;
    END IF;

    -- Calculate current vote counts
    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO v_upvotes, v_downvotes
    FROM votes
    WHERE announcement_id = v_announcement_id;

    -- Update the announcement with new counts
    UPDATE announcements
    SET
        upvotes_count = v_upvotes,
        downvotes_count = v_downvotes,
        updated_at = NOW()
    WHERE id = v_announcement_id;

    RETURN NULL; -- Result is ignored for AFTER trigger
END;
$$;

-- ============================================================================
-- Drop existing triggers if they exist
-- ============================================================================

DROP TRIGGER IF EXISTS update_vote_counts_on_insert ON votes;
DROP TRIGGER IF EXISTS update_vote_counts_on_update ON votes;
DROP TRIGGER IF EXISTS update_vote_counts_on_delete ON votes;

-- ============================================================================
-- Create triggers for INSERT, UPDATE, DELETE
-- ============================================================================

CREATE TRIGGER update_vote_counts_on_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_announcement_vote_counts();

CREATE TRIGGER update_vote_counts_on_update
    AFTER UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_announcement_vote_counts();

CREATE TRIGGER update_vote_counts_on_delete
    AFTER DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_announcement_vote_counts();

-- ============================================================================
-- Recalculate all existing vote counts (in case of migration)
-- ============================================================================

UPDATE announcements a
SET
    upvotes_count = (
        SELECT COUNT(*)
        FROM votes v
        WHERE v.announcement_id = a.id AND v.vote_type = 'upvote'
    ),
    downvotes_count = (
        SELECT COUNT(*)
        FROM votes v
        WHERE v.announcement_id = a.id AND v.vote_type = 'downvote'
    );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION update_announcement_vote_counts() IS
'Automatically updates upvotes_count and downvotes_count on announcements when votes change. Ensures counts are always accurate and prevents race conditions.';

COMMENT ON TRIGGER update_vote_counts_on_insert ON votes IS
'Updates vote counts when a new vote is added';

COMMENT ON TRIGGER update_vote_counts_on_update ON votes IS
'Updates vote counts when a vote type changes (upvote ↔ downvote)';

COMMENT ON TRIGGER update_vote_counts_on_delete ON votes IS
'Updates vote counts when a vote is removed';
