export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { query } from "@/lib/db";
import AdminUsersGrid from "@/components/admin-users-grid";

type UserRow = {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  role: "admin" | "user";
  is_active: number;
  created_at: string;
};

type BranchOption = {
  id: number;
  name: string;
};

type UserBranchRow = {
  user_id: number;
  branch_id: number;
};

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as { role?: string })?.role !== "admin") {
    redirect("/login");
  }

  const [users, branches, userBranches] = await Promise.all([
    query<UserRow[]>(
      `SELECT id, username, display_name, email, role, is_active, created_at
       FROM users
       ORDER BY id ASC`,
    ),
    query<BranchOption[]>("SELECT id, name FROM branches WHERE is_deleted = 0 ORDER BY id ASC"),
    query<UserBranchRow[]>("SELECT user_id, branch_id FROM user_in_branch"),
  ]);

  return (
    <AdminUsersGrid
      initialUsers={users}
      branches={branches}
      initialUserBranches={userBranches}
    />
  );
}
