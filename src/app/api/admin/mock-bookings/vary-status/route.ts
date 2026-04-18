import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  const result = await query(
    `UPDATE bookings
        SET booking_status = CASE (id % 3)
          WHEN 0 THEN 'pending'
          WHEN 1 THEN 'confirmed'
          ELSE 'completed'
        END
      WHERE booking_date = ?
        AND is_deleted = 0`,
    [date],
  );
  return NextResponse.json({ ok: true, result });
}
