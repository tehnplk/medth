import { NextResponse } from "next/server";
import type mysql from "mysql2/promise";
import { query } from "@/lib/db";
import { getAuditUser } from "@/lib/audit-user";

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

  const result = await query<mysql.ResultSetHeader>(
    `UPDATE bookings
     SET booking_status = ?
     WHERE id = ?
       AND is_deleted = 0`,
    [status, bookingId],
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
  }

  // @ts-expect-error global.io exists in background server
  if (global.io) global.io.emit("refreshBookings");

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

  const deleteBy = await getAuditUser();
  const result = await query<mysql.ResultSetHeader>(
    `UPDATE bookings
     SET is_deleted = 1,
         delete_by = ?,
         delete_date_time = NOW(),
         delete_note = ?
     WHERE id = ?
       AND is_deleted = 0`,
    [deleteBy, deleteNote, bookingId],
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
  }

  // @ts-expect-error global.io exists in background server
  if (global.io) global.io.emit("refreshBookings");

  return NextResponse.json({ ok: true });
}
