import AdminOpenCloseGrid from "@/components/admin-open-close-grid";
import { query } from "@/lib/db";

type BranchStatusRow = {
  id: number;
  name: string;
  is_active: number;
  opening_hours: string | null;
  today_bookings: number;
};

export default async function AdminOpenClosePage() {
  const branches = await query<BranchStatusRow[]>(
    `SELECT
       b.id,
       b.name,
       b.is_active,
       b.opening_hours,
       (
         SELECT COUNT(*)
         FROM bookings bk
         WHERE bk.branch_id = b.id
           AND bk.booking_date = CURDATE()
           AND bk.booking_status <> 'cancelled'
       ) AS today_bookings
     FROM branches b
     ORDER BY b.id ASC`,
  );

  return <AdminOpenCloseGrid initialRows={branches} />;
}
