import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";

type ExistsRow = { total: number };
type BookingRow = { booking_code: string };
type LockRow = { lock_result: number | null };

function sanitize(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function bookingCodePrefix(date: string): string {
  const safeDate = date.replaceAll("-", "");
  return `BK${safeDate}`;
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

export async function POST(request: Request) {
  const formData = await request.formData();

  const branchId = Number(sanitize(formData.get("branch")));
  const bookingDate = sanitize(formData.get("date"));
  const slotId = Number(sanitize(formData.get("slot")));
  const staffId = Number(sanitize(formData.get("staff")));
  const firstName = sanitize(formData.get("first_name"));
  const lastName = sanitize(formData.get("last_name"));
  const phone = sanitize(formData.get("phone"));

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
    return NextResponse.redirect(
      new URL(`/confirm?branch=${branchId || ""}&date=${bookingDate}&slot=${slotId || ""}&staff=${staffId || ""}`, request.url),
    );
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

  try {
    const [rawLockRows] = await connection.query("SELECT GET_LOCK(?, 5) AS lock_result", [lockKey]);
    const lockRows = rawLockRows as LockRow[];
    const lockResult = lockRows[0]?.lock_result ?? 0;

    if (lockResult !== 1) {
      return NextResponse.redirect(
        new URL(`/confirm?branch=${branchId}&date=${bookingDate}&slot=${slotId}&staff=${staffId}`, request.url),
      );
    }

    const [rawExistingRows] = await connection.query(
      `SELECT booking_code
       FROM bookings
       WHERE branch_id = ?
         AND booking_date = ?
         AND time_slot_id = ?
         AND staff_id = ?
       LIMIT 1`,
      [branchId, bookingDate, slotId, staffId],
    );
    const existingRows = rawExistingRows as BookingRow[];

    const existingCode = existingRows[0]?.booking_code;
    if (existingCode) {
      return NextResponse.redirect(
        new URL(`/success?booking_code=${encodeURIComponent(existingCode)}&branch=${branchId}`, request.url),
      );
    }

    const code = await generateBookingCode(bookingCodePrefix(bookingDate), branchId);

    try {
      await connection.query(
        `INSERT INTO bookings (
          branch_id,
          booking_code,
          customer_name,
          customer_phone,
          line_id,
          confirm_status,
          booking_date,
          time_slot_id,
          staff_id,
          notes,
          booking_status
        ) VALUES (?, ?, ?, ?, NULL, 'confirmed', ?, ?, ?, NULL, 'confirmed')`,
        [branchId, code, customerName, phone, bookingDate, slotId, staffId],
      );
    } catch (error) {
      const dbError = error as { code?: string; errno?: number };
      if (dbError.code === "ER_DUP_ENTRY" || dbError.errno === 1062) {
        const [rawDuplicateRows] = await connection.query(
          `SELECT booking_code
           FROM bookings
           WHERE branch_id = ?
             AND booking_date = ?
             AND time_slot_id = ?
             AND staff_id = ?
           LIMIT 1`,
          [branchId, bookingDate, slotId, staffId],
        );
        const duplicateRows = rawDuplicateRows as BookingRow[];
        const duplicateCode = duplicateRows[0]?.booking_code;
        if (duplicateCode) {
          return NextResponse.redirect(
            new URL(`/success?booking_code=${encodeURIComponent(duplicateCode)}&branch=${branchId}`, request.url),
          );
        }
      }
      throw error;
    }

    return NextResponse.redirect(
      new URL(`/success?booking_code=${encodeURIComponent(code)}&branch=${branchId}`, request.url),
    );
  } finally {
    try {
      await connection.query("SELECT RELEASE_LOCK(?) AS lock_result", [lockKey]);
    } finally {
      connection.release();
    }
  }
}
