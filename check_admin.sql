-- Check if user is system admin
SELECT 
  u.email,
  sr.role,
  sr.granted_at
FROM auth.users u
LEFT JOIN system_roles sr ON u.id = sr.user_id
WHERE u.email = 'charles3togile@gmail.com';
