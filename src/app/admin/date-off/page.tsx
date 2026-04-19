export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import AdminDateOffGrid from "@/components/admin-date-off-grid";
import { query } from "@/lib/db";

type BranchRow = {
  id: number;
  name: string;
};

type DateOffRow = {
  id: number;
  branch_id: number;
  date_off: string;
  branch_name: string;
};

export default async function AdminDateOffPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  const userId = session?.user ? parseInt((session.user as { id?: string }).id ?? "0", 10) : null;

  let branches: BranchRow[];
  if (role === "admin") {
    branches = await query<BranchRow[]>("SELECT id, name FROM branches WHERE is_deleted = 0 ORDER BY id ASC");
  } else if (userId && !isNaN(userId)) {
    branches = await query<BranchRow[]>(
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

  const dateOffList = await query<DateOffRow[]>(
    `SELECT
       bdo.id,
       bdo.branch_id,
       bdo.date_off,
       b.name AS branch_name
     FROM branch_date_off bdo
     JOIN branches b ON b.id = bdo.branch_id
     WHERE b.id IN (${branches.map(b => b.id).join(',')})
     ORDER BY b.id ASC, bdo.date_off ASC`,
  );

  return <AdminDateOffGrid initialRows={dateOffList} branches={branches} />;
}
