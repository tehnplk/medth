export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import AdminStaffGrid from "@/components/admin-staff-grid";
import { query } from "@/lib/db";

type StaffRow = {
  id: number;
  branch_id: number;
  full_name: string;
  staff_code: string;
  phone: string | null;
  gender: "male" | "female" | "other";
  photo_path: string | null;
  skill_note: string | null;
  status: "active" | "inactive";
  branch_name: string;
};

type BranchOption = {
  id: number;
  name: string;
};

export default async function AdminStaffPage() {
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

  let staffList: StaffRow[];
  if (branches.length === 0) {
    staffList = [];
  } else {
    staffList = await query<StaffRow[]>(
      `SELECT
         s.id,
         s.branch_id,
         s.full_name,
         s.staff_code,
         s.phone,
         s.gender,
         s.photo_path,
         s.skill_note,
         s.status,
         b.name AS branch_name
       FROM staff s
       JOIN branches b ON b.id = s.branch_id
       WHERE s.is_deleted = 0
         AND b.is_deleted = 0
         AND b.id IN (${branches.map(b => b.id).join(',')})
       ORDER BY b.id ASC, s.staff_code ASC`,
    );
  }

  return <AdminStaffGrid initialRows={staffList} branches={branches} />;
}
