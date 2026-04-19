import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const role = (session.user as { role?: string })?.role;

    // Admin users can see all branches
    if (role === "admin") {
      const branches = await query(
        "SELECT id, name FROM branches WHERE is_active = 1 AND is_deleted = 0 ORDER BY id ASC",
      );
      return NextResponse.json({ branches });
    }

    // Non-admin users only see assigned branches
    const userBranches = await query(
      `SELECT b.id, b.name
       FROM branches b
       INNER JOIN user_in_branch ub ON ub.branch_id = b.id
       WHERE ub.user_id = ? AND b.is_active = 1 AND b.is_deleted = 0
       ORDER BY b.id ASC`,
      [userId],
    );
    return NextResponse.json({ branches: userBranches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch branches" },
      { status: 500 },
    );
  }
}
