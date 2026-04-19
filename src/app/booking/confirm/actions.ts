"use server";

import { redirect } from "next/navigation";
import { getPool, query } from "@/lib/db";

declare global {
  // eslint-disable-next-line no-var
  var io: import("socket.io").Server | undefined;
}

type ExistsRow = { total: number };
type BookingRow = { booking_code: string; customer_phone: string };
type LockRow = { lock_result: number | null };

function sanitize(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function bookingCodePrefix(date: string): string {
  return `BK${date.replaceAll("-", "")}`;
}

function normalizeCustomerName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

function createBookingLockKey(params: {
  branchId: number;
  bookingDate: string;
  slotId: number;
  staffId: number;
  customerName: string;
  phone: string;
}): string {
  const normalizedName = params.customerName.toLowerCase().replace(/\s+/g, " ");
  return [
    "medth",
    "booking",
    params.branchId,
    params.bookingDate,
    params.slotId,
    params.staffId,
    normalizedName,
    params.phone,
  ].join(":");
}

async function generateBookingCode(prefix: string, branchId: number): Promise<string> {
  for (let i = 0; i < 50; i += 1) {
    const suffix = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    const code = `${prefix}${suffix}`;
    const rows = await query<ExistsRow[]>(
      "SELECT COUNT(*) AS total FROM bookings WHERE branch_id = ? AND booking_code = ?",
      [branchId, code],
    );
    if ((rows[0]?.total ?? 0) === 0) return code;
  }
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

export async function submitBooking(formData: FormData): Promise<void> {
  const branchId = Number(sanitize(formData.get("branch")));
  const bookingDate = sanitize(formData.get("date"));
  const slotId = Number(sanitize(formData.get("slot")));
  const staffId = Number(sanitize(formData.get("staff")));
  const lineId = sanitize(formData.get("line_id"));
  const firstName = sanitize(formData.get("first_name"));
  const lastName = sanitize(formData.get("last_name"));
  const phone = sanitize(formData.get("phone"));

  const lineIdQuery = lineId ? `&line_id=${encodeURIComponent(lineId)}` : "";
  const backToConfirm = `/booking/confirm?branch=${branchId || ""}&date=${bookingDate}&slot=${slotId || ""}&staff=${staffId || ""}${lineIdQuery}`;
  const backToStaffBooked = `/booking/staff?branch=${branchId}&date=${bookingDate}&slot=${slotId}&error=booked${lineIdQuery}`;

  if (
    !Number.isFinite(branchId) ||
    branchId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
    !Number.isFinite(slotId) ||
    slotId <= 0 ||
    !Number.isFinite(staffId) ||
    staffId <= 0 ||
    !firstName ||
    !lastName ||
    !phone
  ) {
    redirect(backToConfirm);
  }

  const customerName = normalizeCustomerName(firstName, lastName);
  const lockKey = createBookingLockKey({
    branchId,
    bookingDate,
    slotId,
    staffId,
    customerName,
    phone,
  });

  const connection = await getPool().getConnection();
  let successCode: string | null = null;
  let redirectTo: string | null = null;

  try {
    const [rawLockRows] = await connection.query("SELECT GET_LOCK(?, 5) AS lock_result", [lockKey]);
    const lockRows = rawLockRows as LockRow[];
    if ((lockRows[0]?.lock_result ?? 0) !== 1) {
      redirectTo = backToConfirm;
    } else {
      const [rawBranchRows] = await connection.query(
        `SELECT id FROM branches WHERE id = ? AND is_active = 1 AND is_deleted = 0 LIMIT 1`,
        [branchId],
      );
      const [rawDateOffRows] = await connection.query(
        `SELECT id FROM branch_date_off WHERE branch_id = ? AND date_off = ? LIMIT 1`,
        [branchId, bookingDate],
      );
      const [rawStaffRows] = await connection.query(
        `SELECT id FROM staff WHERE id = ? AND branch_id = ? AND status = 'active' AND is_deleted = 0 LIMIT 1`,
        [staffId, branchId],
      );
      const [rawSlotRows] = await connection.query(
        `SELECT id FROM time_slots WHERE id = ? AND branch_id = ? LIMIT 1`,
        [slotId, branchId],
      );

      if (
        (rawBranchRows as unknown[]).length === 0 ||
        (rawDateOffRows as unknown[]).length > 0 ||
        (rawStaffRows as unknown[]).length === 0 ||
        (rawSlotRows as unknown[]).length === 0
      ) {
        redirectTo = backToConfirm;
      } else {
        const [rawExistingRows] = await connection.query(
          `SELECT booking_code, customer_phone
           FROM bookings
           WHERE branch_id = ? AND booking_date = ? AND time_slot_id = ? AND staff_id = ? AND is_deleted = 0
           LIMIT 1`,
          [branchId, bookingDate, slotId, staffId],
        );
        const existingRows = rawExistingRows as BookingRow[];

        if (existingRows.length > 0) {
          if (existingRows[0].customer_phone === phone) {
            successCode = existingRows[0].booking_code;
          } else {
            redirectTo = backToStaffBooked;
          }
        } else {
          const code = await generateBookingCode(bookingCodePrefix(bookingDate), branchId);
          try {
            await connection.query(
              `INSERT INTO bookings (
                branch_id, booking_code, customer_name, customer_phone, line_id,
                booking_date, time_slot_id, staff_id, notes, booking_status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'confirmed')`,
              [branchId, code, customerName, phone, lineId || null, bookingDate, slotId, staffId],
            );
            successCode = code;
          } catch (error) {
            const dbError = error as { code?: string; errno?: number };
            if (dbError.code === "ER_DUP_ENTRY" || dbError.errno === 1062) {
              const [rawDupRows] = await connection.query(
                `SELECT booking_code, customer_phone
                 FROM bookings
                 WHERE branch_id = ? AND booking_date = ? AND time_slot_id = ? AND staff_id = ? AND is_deleted = 0
                 LIMIT 1`,
                [branchId, bookingDate, slotId, staffId],
              );
              const dupRows = rawDupRows as BookingRow[];
              if (dupRows.length > 0 && dupRows[0].customer_phone === phone) {
                successCode = dupRows[0].booking_code;
              } else {
                redirectTo = backToStaffBooked;
              }
            } else {
              throw error;
            }
          }
        }
      }
    }
  } finally {
    try {
      await connection.query("SELECT RELEASE_LOCK(?) AS lock_result", [lockKey]);
    } finally {
      connection.release();
    }
  }

  if (successCode) {
    if (global.io) global.io.emit("refreshBookings");
    redirect(`/booking/success?booking_code=${encodeURIComponent(successCode)}&branch=${branchId}`);
  }
  if (redirectTo) {
    redirect(redirectTo);
  }
  redirect(backToConfirm);
}
