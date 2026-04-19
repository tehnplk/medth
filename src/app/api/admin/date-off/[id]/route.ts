import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE - Delete date off record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  const userId = session?.user ? parseInt((session.user as { id?: string }).id ?? "0", 10) : null;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idNum = parseInt(id);

  try {
    // Get branch_id of the date off record
    const record = await query<{ branch_id: number }[]>(
      "SELECT branch_id FROM branch_date_off WHERE id = ?",
      [idNum],
    );

    if (!record || record.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const branchId = record[0].branch_id;

    // Check if user has access to this branch
    if (role !== "admin") {
      const hasAccess = await query<{ user_id: number; branch_id: number }[]>(
        "SELECT 1 FROM user_in_branch WHERE user_id = ? AND branch_id = ?",
        [userId, branchId],
      );
      if (!hasAccess || hasAccess.length === 0) {
        return NextResponse.json({ error: "Unauthorized for this branch" }, { status: 403 });
      }
    }

    await query("DELETE FROM branch_date_off WHERE id = ?", [idNum]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
