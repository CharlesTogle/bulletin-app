# Group Approval System Implementation

This document outlines the complete group approval workflow that requires system admin approval for all new groups.

## 🎯 Requirements Implemented

✅ **1. Sign Up Page with Two Modes**
- Create a group (becomes group admin)
- Join existing group as member (requires group code)

✅ **2. Database Approval Column**
- Added `approved`, `approved_at`, `approved_by` columns to groups table
- Default `approved = false` for all new groups

✅ **3. System Admin Approval Controls**
- System admins can view pending groups
- Approve or reject groups via admin dashboard
- Rejection deletes the group permanently

✅ **4. Pending Approval Redirect**
- Group admins with unapproved groups see "Pending Approval" page
- Cannot access full group features until approved
- Auto-redirect using `GroupApprovalCheck` component

✅ **5. Hide Unapproved Groups from Members**
- Members attempting to join unapproved groups get "Group does not exist" error
- RLS policies enforce approved=true for member joins
- Unapproved groups are invisible to non-members

## 📁 Files Created/Modified

### Database Migration
- **`supabase/migrations/004_add_group_approval.sql`**
  - Adds `approved`, `approved_at`, `approved_by` columns
  - Updates RLS policies for approval checks
  - Creates `pending_groups` view for system admin

### Pages
- **`app/signup/page.tsx`** ✨ NEW
  - Two-tab interface: Create Group | Join Group
  - Handles user sign up + group creation/joining
  - Redirects to pending approval or group dashboard

- **`app/pending-approval/page.tsx`** ✨ NEW
  - Displays pending status for group admins
  - Shows group details and approval timeline
  - Refresh button to check approval status

### Components
- **`components/admin/PendingGroupsManager.tsx`** ✨ NEW
  - System admin interface for managing pending groups
  - Approve/reject actions with confirmation
  - Real-time list of pending groups

- **`components/auth/GroupApprovalCheck.tsx`** ✨ NEW
  - Client-side approval status checker
  - Auto-redirects to /pending-approval if needed
  - Can be added to layouts or specific pages

### Server Actions
- **`actions/system-admin.ts`** ✏️ MODIFIED
  - Added `getPendingGroups()` - List pending groups
  - Added `approveGroup(groupId)` - Approve a group
  - Added `rejectGroup(groupId)` - Reject and delete group

- **`actions/groups.ts`** ✏️ MODIFIED
  - Updated `joinGroup()` to check approved status
  - Added `checkUserGroupApprovalStatus()` - Check user's groups
  - Returns "Group does not exist" for unapproved groups

### Types
- **`types/database.ts`** ✏️ MODIFIED
  - Added `approved`, `approved_at`, `approved_by` to Group interface

### Documentation
- **`CLAUDE.md`** ✏️ UPDATED
  - Added "Group Approval Workflow" section
  - Updated project structure
  - Documented all new components and actions

- **`supabase/migrations/README.md`** ✏️ UPDATED
  - Added migration 004 documentation
  - Documented approval workflow
  - Listed all related actions and components

## 🔄 User Workflows

### Workflow 1: Create a Group

1. User visits `/signup`
2. Selects "Create Group" tab
3. Enters email, password, group name, description
4. Clicks "Create Account & Group"
5. System creates:
   - User account via Supabase Auth
   - Group with `approved = false`
   - Group membership with role = 'admin'
6. User redirected to `/pending-approval`
7. Sees "Group Pending Approval" message
8. Waits for system admin approval

### Workflow 2: Join a Group

1. User visits `/signup`
2. Selects "Join Group" tab
3. Enters email, password, group code
4. Clicks "Create Account & Join Group"
5. System validates:
   - Group code exists
   - Group is approved (`approved = true`)
6. If approved:
   - Creates user account
   - Joins group as member
   - Redirects to group dashboard
7. If not approved:
   - Shows "Group does not exist"

### Workflow 3: System Admin Approval

1. System admin logs in
2. Navigates to admin dashboard
3. Views `PendingGroupsManager` component
4. Sees list of pending groups with:
   - Group name and code
   - Creator email
   - Creation date
   - Admin count
5. For each group, can:
   - **Approve**: Sets `approved = true`, records approval details
   - **Reject**: Deletes the group and all memberships
6. Group admin is notified (can check status via "Check Status" button)

## 🔐 Security & RLS Policies

### Groups Table RLS
```sql
-- Members can view their groups (even if unapproved)
-- Others cannot see unapproved groups
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT TO authenticated
  USING (
    -- Is a member
    EXISTS (SELECT 1 FROM group_members WHERE ...)
    OR
    -- Is system admin
    EXISTS (SELECT 1 FROM system_roles WHERE ...)
  );
```

### Group Members RLS
```sql
-- Members can only join APPROVED groups
CREATE POLICY "Users can join approved groups as member"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    role = 'member'
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM groups
      WHERE id = group_id
      AND approved = TRUE  -- Must be approved!
    )
  );
```

## 🧪 Testing Guide

### Test Case 1: Create Group Flow
1. Visit `/signup`, select "Create Group"
2. Fill in details and submit
3. ✅ Should redirect to `/pending-approval`
4. ✅ Should show group name and code
5. ✅ Should show "Pending Approval" status

### Test Case 2: Join Approved Group
1. System admin approves a group
2. Visit `/signup`, select "Join Group"
3. Enter valid group code
4. ✅ Should successfully join group
5. ✅ Should redirect to group dashboard

### Test Case 3: Join Unapproved Group
1. Get code from an unapproved group
2. Visit `/signup`, select "Join Group"
3. Enter the unapproved group code
4. ✅ Should show error: "Group does not exist"
5. ✅ Should NOT join the group

### Test Case 4: System Admin Approval
1. Login as system admin
2. View pending groups
3. Approve a group
4. ✅ Group should move to approved status
5. ✅ Members should now be able to join
6. ✅ Group admin should access group dashboard

### Test Case 5: Auto-Redirect
1. Login as group admin with unapproved group
2. Try to access any protected page
3. ✅ Should auto-redirect to `/pending-approval`
4. ✅ Should show pending message

## 📊 Database Schema Changes

```sql
-- New columns in groups table
ALTER TABLE groups
  ADD COLUMN approved BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- New index for performance
CREATE INDEX idx_groups_approved ON groups(approved);

-- New view for system admins
CREATE VIEW pending_groups AS
SELECT
  g.id,
  g.name,
  g.code,
  g.description,
  g.created_at,
  u.email as creator_email,
  COUNT(DISTINCT gm.user_id) as admin_count
FROM groups g
LEFT JOIN auth.users u ON g.creator_id = u.id
LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.role = 'admin'
WHERE g.approved = FALSE
GROUP BY g.id, g.name, g.code, g.description, g.created_at, u.email
ORDER BY g.created_at DESC;
```

## 🚀 Deployment Checklist

1. ✅ Run migration `004_add_group_approval.sql` in Supabase
2. ✅ Ensure system admin role is granted to at least one user
3. ✅ Test sign up flows (create and join)
4. ✅ Test approval workflow
5. ✅ Verify RLS policies are working
6. ✅ Add `GroupApprovalCheck` to main app layout if needed

## 🎨 UI Components Usage

### In System Admin Dashboard
```tsx
import { PendingGroupsManager } from '@/components/admin/PendingGroupsManager';

export default function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <PendingGroupsManager />
    </div>
  );
}
```

### In App Layout (Optional Auto-Redirect)
```tsx
import { GroupApprovalCheck } from '@/components/auth/GroupApprovalCheck';

export default function AppLayout({ children }) {
  return (
    <>
      <GroupApprovalCheck />
      {children}
    </>
  );
}
```

## 📝 Notes

- All existing groups created before this migration will have `approved = false`
- System admins should review and approve/reject all existing groups
- Consider adding email notifications for approval/rejection (future enhancement)
- Group codes remain unchanged after approval
- Rejection permanently deletes the group (no soft delete)

## 🔮 Future Enhancements

- [ ] Email notifications on approval/rejection
- [ ] Approval request reason/message from group creator
- [ ] Bulk approve/reject for system admins
- [ ] Approval history/audit log
- [ ] Appeal rejected groups
- [ ] Auto-approve trusted users/domains
