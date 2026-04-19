import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all date off records
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  const userId = session?.user ? parseInt((session.user as { id?: string }).id ?? "0", 10) : null;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let branchFilter = "";
  const params: any[] = [];

  if (role !== "admin") {
    branchFilter = "WHERE b.id IN (SELECT branch_id FROM user_in_branch WHERE user_id = ?)";
    params.push(userId);
  }

  const dateOffList = await query(
    `SELECT
       bdo.id,
       bdo.branch_id,
       bdo.date_off,
       b.name AS branch_name
     FROM branch_date_off bdo
     JOIN branches b ON b.id = bdo.branch_id
     ${branchFilter}
     ORDER BY b.id ASC, bdo.date_off ASC`,
    params,
  );

  return NextResponse.json(dateOffList);
}

// POST - Add date off record
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  const userId = session?.user ? parseInt((session.user as { id?: string }).id ?? "0", 10) : null;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { branch_id, date_off } = body;

    if (!branch_id || !date_off) {
      return NextResponse.json({ error: "branch_id and date_off are required" }, { status: 400 });
    }

    // Check if user has access to this branch
    if (role !== "admin") {
      const hasAccess = await query<{ user_id: number; branch_id: number }[]>(
        "SELECT 1 FROM user_in_branch WHERE user_id = ? AND branch_id = ?",
        [userId, branch_id],
      );
      if (hasAccess.length === 0) {
        return NextResponse.json({ error: "Unauthorized for this branch" }, { status: 403 });
      }
    }

    await query(
      "INSERT INTO branch_date_off (branch_id, date_off) VALUES (?, ?)",
      [branch_id, date_off],
    );

    // Get the inserted record to return proper data
    const inserted = await query<{ id: number }[]>(
      "SELECT id FROM branch_date_off WHERE branch_id = ? AND date_off = ? ORDER BY id DESC LIMIT 1",
      [branch_id, date_off],
    );

    return NextResponse.json({ success: true, insertId: inserted[0]?.id });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "วันหยุดนี้มีอยู่แล้วสำหรับสาขานี้" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
