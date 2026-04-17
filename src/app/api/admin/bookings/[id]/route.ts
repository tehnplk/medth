import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const ALLOWED_STATUSES = ["pending", "confirmed", "completed"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { booking_status?: string }
    | null;
  const status = body?.booking_status;
  if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  await query("UPDATE bookings SET booking_status = ? WHERE id = ?", [
    status,
    bookingId,
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { delete_note?: string }
    | null;
  const deleteNote =
    typeof body?.delete_note === "string" ? body.delete_note.trim() : "";

  if (!deleteNote) {
    return NextResponse.json(
      { error: "delete note is required" },
      { status: 400 },
    );
  }

  await query(
    `INSERT INTO bookings_delete (
      id,
      branch_id,
      booking_code,
      customer_name,
      customer_phone,
      line_id,
      booking_date,
      time_slot_id,
      staff_id,
      notes,
      booking_status,
      created_at,
      updated_at,
      delete_by,
      delete_note,
      delete_date_time
    )
    SELECT
      id,
      branch_id,
      booking_code,
      customer_name,
      customer_phone,
      line_id,
      booking_date,
      time_slot_id,
      staff_id,
      notes,
      booking_status,
      created_at,
      updated_at,
      'admin' AS delete_by,
      ? AS delete_note,
      NOW() AS delete_date_time
    FROM bookings
    WHERE id = ?`,
    [deleteNote, bookingId],
  );
  await query("DELETE FROM bookings WHERE id = ?", [bookingId]);
  return NextResponse.json({ ok: true });
}
