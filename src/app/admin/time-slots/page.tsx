export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import AdminTimeSlotsGrid from "@/components/admin-time-slots-grid";
import { query } from "@/lib/db";

type TimeSlotRow = {
  id: number;
  branch_id: number;
  begin_time: string;
  end_time: string;
  duration_minutes: number;
  branch_name: string;
};

type BranchOption = {
  id: number;
  name: string;
};

export default async function AdminTimeSlotsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  const userId = session?.user ? parseInt((session.user as { id?: string }).id ?? "0", 10) : null;

  let branches: BranchOption[];
  if (role === "admin") {
    // Admin can see all branches
    branches = await query<BranchOption[]>("SELECT id, name FROM branches WHERE is_deleted = 0 ORDER BY id ASC");
  } else if (userId && !isNaN(userId)) {
    // Non-admin users only see assigned branches
    branches = await query<BranchOption[]>(
      `SELECT b.id, b.name
       FROM branches b
       INNER JOIN user_in_branch ub ON ub.branch_id = b.id
       WHERE ub.user_id = ? AND b.is_deleted = 0
       ORDER BY b.id ASC`,
      [userId],
    );
  } else {
    branches = [];
  }

  const branchIds = branches.map(b => b.id);
  let slots: TimeSlotRow[];
  if (branchIds.length === 0) {
    slots = [];
  } else {
    slots = await query<TimeSlotRow[]>(
      `SELECT
         ts.id,
         ts.branch_id,
         ts.begin_time,
         ts.end_time,
         ts.duration_minutes,
         b.name AS branch_name
       FROM time_slots ts
       JOIN branches b ON b.id = ts.branch_id
       WHERE b.is_deleted = 0
         AND b.id IN (${branchIds.join(',')})
       ORDER BY b.id ASC, ts.begin_time ASC`,
    );
  }

  return <AdminTimeSlotsGrid initialRows={slots} branches={branches} />;
}
