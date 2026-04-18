export const dynamic = "force-dynamic";

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
  const [slots, branches] = await Promise.all([
    query<TimeSlotRow[]>(
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
       ORDER BY b.id ASC, ts.begin_time ASC`,
    ),
    query<BranchOption[]>("SELECT id, name FROM branches WHERE is_deleted = 0 ORDER BY id ASC"),
  ]);

  return <AdminTimeSlotsGrid initialRows={slots} branches={branches} />;
}
