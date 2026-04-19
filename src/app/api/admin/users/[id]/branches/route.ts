import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { query } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await request.json();
    const { branch_ids } = body;

    if (!Array.isArray(branch_ids)) {
      return NextResponse.json({ error: "branch_ids must be an array" }, { status: 400 });
    }

    // Validate all branch IDs
    const validBranchIds = branch_ids.filter((id: any) => typeof id === 'number' && !isNaN(id) && id > 0);

    // Delete existing assignments
    await query(`DELETE FROM user_in_branch WHERE user_id = ?`, [userId]);

    // Insert new assignments using parameterized query
    for (const branchId of validBranchIds) {
      await query(`INSERT INTO user_in_branch (user_id, branch_id) VALUES (?, ?)`, [userId, branchId]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update branches" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    const branches = await query(
      `SELECT branch_id FROM user_in_branch WHERE user_id = ?`,
      [userId],
    );
    return NextResponse.json({ rows: branches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch branches" },
      { status: 500 },
    );
  }
}
