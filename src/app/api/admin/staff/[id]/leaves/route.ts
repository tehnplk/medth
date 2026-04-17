import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type LeaveRow = {
  id: number;
  staff_id: number;
  branch_id: number;
  leave_date: string;
  leave_type: "sick" | "personal" | "vacation";
  reason: string | null;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/staff/[id]/leaves">,
) {
  const { id: rawId } = await context.params;
  const staffId = parseId(rawId);

  if (!staffId) {
    return NextResponse.json({ error: "รหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const rows = await query<LeaveRow[]>(
      `SELECT id, staff_id, branch_id, DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date, leave_type, reason
       FROM staff_leaves
       WHERE staff_id = ?
       ORDER BY leave_date DESC`,
      [staffId],
    );
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลการลาได้" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/staff/[id]/leaves">,
) {
  const { id: rawId } = await context.params;
  const staffId = parseId(rawId);

  if (!staffId) {
    return NextResponse.json({ error: "รหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const leaveDate = typeof body.leave_date === "string" ? body.leave_date.trim() : "";
    const leaveType = ["sick", "personal", "vacation"].includes(body.leave_type)
      ? body.leave_type
      : "personal";
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
    const branchId = Number(body.branch_id);

    if (!leaveDate) {
      return NextResponse.json({ error: "กรุณาเลือกวันที่ลา" }, { status: 400 });
    }

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return NextResponse.json({ error: "สาขาไม่ถูกต้อง" }, { status: 400 });
    }

    const result = await query<mysql.ResultSetHeader>(
      `INSERT INTO staff_leaves (staff_id, branch_id, leave_date, leave_type, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [staffId, branchId, leaveDate, leaveType, reason],
    );

    const rows = await query<LeaveRow[]>(
      "SELECT id, staff_id, branch_id, DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date, leave_type, reason FROM staff_leaves WHERE id = ?",
      [result.insertId],
    );

    return NextResponse.json({ row: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถบันทึกการลาได้" }, { status: 500 });
  }
}
