-- ============================================================================
-- Update announcements_with_details view for new tags system
-- ============================================================================

DROP VIEW IF EXISTS announcements_with_details;

CREATE OR REPLACE VIEW announcements_with_details AS
SELECT
  a.*,
  u.email as author_email,
  c.name as category_name,
  c.color as category_color,
  -- Get tags as JSON array with id, title, and color
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', t.id,
          'title', t.title,
          'color', t.color
        )
        ORDER BY t.title
      )
      FROM announcement_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.announcement_id = a.id
    ),
    '[]'::json
  ) as tags,
  (a.upvotes_count - a.downvotes_count) as net_votes
FROM announcements a
LEFT JOIN auth.users u ON a.author_id = u.id
LEFT JOIN categories c ON a.category_id = c.id
GROUP BY a.id, u.email, c.name, c.color;

COMMENT ON VIEW announcements_with_details IS 'Announcements with author, category, tags (as JSON), and calculated net votes';
