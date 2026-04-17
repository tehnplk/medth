import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const branchParam = url.searchParams.get("branch");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const safeDateCode = date.replaceAll("-", "");
  const branchFilter = branchParam ? " AND s.branch_id = ?" : "";
  const params: unknown[] = [safeDateCode, date];
  if (branchParam) params.push(Number(branchParam));

  const result = await query<{ affectedRows: number } & object>(
    `INSERT IGNORE INTO bookings (
        branch_id,
        booking_code,
        customer_name,
        customer_phone,
        booking_date,
        time_slot_id,
        staff_id,
        booking_status
      )
      SELECT
        s.branch_id,
        CONCAT('BK', ?, LPAD(s.id * 100 + t.id, 6, '0')),
        CONCAT('ลูกค้า ', s.staff_code, '-', LPAD(t.id, 2, '0')),
        CONCAT('081', LPAD(s.id, 3, '0'), LPAD(t.id, 4, '0')),
        ?,
        t.id,
        s.id,
        'confirmed'
      FROM staff s
      JOIN time_slots t ON t.branch_id = s.branch_id
      LEFT JOIN bookings b
        ON b.branch_id = s.branch_id
       AND b.booking_date = ?
       AND b.time_slot_id = t.id
       AND b.staff_id = s.id
      WHERE s.status = 'active' AND b.id IS NULL${branchFilter}`,
    [...params.slice(0, 2), date, ...(branchParam ? [Number(branchParam)] : [])],
  );

  return NextResponse.json({ ok: true, result });
}
