import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type ExistsRow = { total: number };
type BookingCodeRow = { booking_code: string };

function sanitize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function bookingCodePrefix(date: string): string {
  return `BK${date.replaceAll("-", "")}`;
}

async function generateBookingCode(prefix: string, branchId: number): Promise<string> {
  for (let index = 0; index < 50; index += 1) {
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
  const body = (await request.json().catch(() => null)) as {
    branch_id?: number;
    staff_id?: number;
    time_slot_id?: number;
    booking_date?: string;
    customer_name?: string;
    customer_phone?: string;
    booking_status?: string;
  } | null;

  const {
    branch_id,
    staff_id,
    time_slot_id,
    booking_date: rawBookingDate,
    customer_name: rawCustomerName,
    customer_phone: rawCustomerPhone,
    booking_status,
  } = body || {};
  const booking_date = sanitize(rawBookingDate);
  const customer_name = sanitize(rawCustomerName);
  const customer_phone = sanitize(rawCustomerPhone);

  if (
    !branch_id ||
    !staff_id ||
    !time_slot_id ||
    !booking_date ||
    !customer_name ||
    !customer_phone ||
    !booking_status
  ) {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return NextResponse.json({ error: "invalid booking date" }, { status: 400 });
  }

  if (!["pending", "confirmed", "completed"].includes(booking_status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  try {
    const [branchRows, staffRows, slotRows] = await Promise.all([
      query<ExistsRow[]>(
        "SELECT COUNT(*) AS total FROM branches WHERE id = ? AND is_deleted = 0",
        [branch_id],
      ),
      query<ExistsRow[]>(
        `SELECT COUNT(*) AS total
         FROM staff
         WHERE id = ?
           AND branch_id = ?
           AND is_deleted = 0`,
        [staff_id, branch_id],
      ),
      query<ExistsRow[]>(
        "SELECT COUNT(*) AS total FROM time_slots WHERE id = ? AND branch_id = ?",
        [time_slot_id, branch_id],
      ),
    ]);

    if ((branchRows[0]?.total ?? 0) === 0) {
      return NextResponse.json({ error: "branch not found" }, { status: 404 });
    }

    if ((staffRows[0]?.total ?? 0) === 0) {
      return NextResponse.json({ error: "staff not found" }, { status: 404 });
    }

    if ((slotRows[0]?.total ?? 0) === 0) {
      return NextResponse.json({ error: "time slot not found" }, { status: 404 });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const booking_code = await generateBookingCode(bookingCodePrefix(booking_date), branch_id);

      try {
        const result = await query(
          `INSERT INTO bookings (
            branch_id,
            booking_code,
            staff_id,
            time_slot_id,
            booking_date,
            customer_name,
            customer_phone,
            booking_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            branch_id,
            booking_code,
            staff_id,
            time_slot_id,
            booking_date,
            customer_name,
            customer_phone,
            booking_status,
          ],
        );
        // @ts-expect-error global.io exists in background server
        if (global.io) global.io.emit("refreshBookings");

        return NextResponse.json({ ok: true, result, booking_code });
      } catch (error) {
        const dbError = error as { code?: string; errno?: number };
        if (dbError.code !== "ER_DUP_ENTRY" && dbError.errno !== 1062) {
          throw error;
        }

        const existingRows = await query<BookingCodeRow[]>(
          `SELECT booking_code
             FROM bookings
            WHERE branch_id = ?
              AND booking_date = ?
              AND time_slot_id = ?
              AND staff_id = ?
              AND is_deleted = 0
            LIMIT 1`,
          [branch_id, booking_date, time_slot_id, staff_id],
        );
        const existingCode = existingRows[0]?.booking_code;

        if (existingCode) {
          return NextResponse.json(
            { error: "slot already booked", booking_code: existingCode },
            { status: 409 },
          );
        }
      }
    }

    return NextResponse.json(
      { error: "failed to generate a unique booking code" },
      { status: 500 },
    );
  } catch {
    return NextResponse.json(
      { error: "failed to create booking" },
      { status: 500 }
    );
  }
}
