import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type CountRow = {
  total: number;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/staff/[id]/delete-summary">,
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const rows = await query<CountRow[]>(
      `
        SELECT COUNT(*) AS total
        FROM bookings
        WHERE staff_id = ?
          AND booking_date >= CURRENT_DATE()
          AND is_deleted = 0
      `,
      [id],
    );

    return NextResponse.json({
      futureBookingCount: rows[0]?.total ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถตรวจสอบรายการจองล่วงหน้าได้" }, { status: 500 });
  }
}
