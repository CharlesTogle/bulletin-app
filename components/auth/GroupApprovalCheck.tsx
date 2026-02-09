'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkUserGroupApprovalStatus } from '@/actions/groups';

/**
 * Group Approval Check Component
 *
 * Checks if the current user has any unapproved groups where they are admin
 * Redirects to /pending-approval if found
 *
 * Usage: Add to app layout or specific pages
 */
export function GroupApprovalCheck() {
  const router = useRouter();

  useEffect(() => {
    async function checkApproval() {
      const result = await checkUserGroupApprovalStatus();

      if (result.success && result.data.hasUnapprovedGroup) {
        router.push('/pending-approval');
      }
    }

    checkApproval();
  }, [router]);

  // This component doesn't render anything
  return null;
}
