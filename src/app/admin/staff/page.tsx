export const dynamic = "force-dynamic";

import AdminStaffGrid from "@/components/admin-staff-grid";
import { query } from "@/lib/db";

type StaffRow = {
  id: number;
  branch_id: number;
  full_name: string;
  staff_code: string;
  phone: string | null;
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
  const [staffList, branches] = await Promise.all([
    query<StaffRow[]>(
      `SELECT
         s.id,
         s.branch_id,
         s.full_name,
         s.staff_code,
         s.phone,
         s.photo_path,
         s.skill_note,
         s.status,
         b.name AS branch_name
       FROM staff s
       JOIN branches b ON b.id = s.branch_id
       WHERE s.is_deleted = 0
         AND b.is_deleted = 0
       ORDER BY b.id ASC, s.staff_code ASC`,
    ),
    query<BranchOption[]>("SELECT id, name FROM branches WHERE is_deleted = 0 ORDER BY id ASC"),
  ]);

  return <AdminStaffGrid initialRows={staffList} branches={branches} />;
}
