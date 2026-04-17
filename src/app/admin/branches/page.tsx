export const dynamic = "force-dynamic";

import AdminBranchesGrid from "@/components/admin-branches-grid";
import { query } from "@/lib/db";

type BranchRow = {
  id: number;
  name: string;
  location_detail: string | null;
  opening_hours: string | null;
  coordinates: string | null;
  is_active: number;
};

export default async function AdminBranchesPage() {
  const branches = await query<BranchRow[]>(
    `SELECT id, name, location_detail, opening_hours, coordinates, is_active
     FROM branches
     ORDER BY id ASC`,
  );

  return <AdminBranchesGrid initialRows={branches} />;
}
