import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/admin/staff-leaves/[leaveId]">,
) {
  const { leaveId: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสการลาไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    await query<mysql.ResultSetHeader>("DELETE FROM staff_leaves WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบรายการลาได้" }, { status: 500 });
  }
}
