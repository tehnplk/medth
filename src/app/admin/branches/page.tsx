export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import AdminBranchesGrid from "@/components/admin-branches-grid";
import { query } from "@/lib/db";

type BranchRow = {
  id: number;
  name: string;
  location_detail: string | null;
  opening_hours: string | null;
  coordinates: string | null;
  cover_image: string | null;
  is_active: number;
};

export default async function AdminBranchesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  const userId = session?.user ? parseInt((session.user as { id?: string }).id ?? "0", 10) : null;

  let branches: BranchRow[];
  if (role === "admin") {
    // Admin can see all branches
    branches = await query<BranchRow[]>(
      `SELECT id, name, location_detail, opening_hours, coordinates, cover_image, is_active
       FROM branches
       WHERE is_deleted = 0
       ORDER BY id ASC`,
    );
  } else if (userId && !isNaN(userId)) {
    // Non-admin users only see assigned branches
    branches = await query<BranchRow[]>(
      `SELECT b.id, b.name, b.location_detail, b.opening_hours, b.coordinates, b.cover_image, b.is_active
       FROM branches b
       INNER JOIN user_in_branch ub ON ub.branch_id = b.id
       WHERE ub.user_id = ? AND b.is_deleted = 0
       ORDER BY b.id ASC`,
      [userId],
    );
  } else {
    branches = [];
  }

  return <AdminBranchesGrid initialRows={branches} userRole={role ?? "user"} />;
}
