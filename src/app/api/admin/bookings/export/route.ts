import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { query } from "@/lib/db";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

type BranchRow = {
  name: string;
};

type AccessRow = {
  branch_id: number;
};

type TimeSlotRow = {
  id: number;
  begin_time: string;
  end_time: string;
};

type StaffRow = {
  id: number;
  staff_code: string;
  full_name: string;
};

type BookingRow = {
  staff_id: number;
  time_slot_id: number;
  customer_name: string;
  customer_phone: string;
};

type LeaveRow = {
  staff_id: number;
};

function formatTime(raw: string | null): string {
  if (!raw) return "-";
  const [hour = "00", minute = "00"] = raw.split(":");
  return `${hour}.${minute}`;
}

function sanitizeFilenameSegment(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  const userId = session?.user ? Number((session.user as { id?: string }).id ?? "0") : 0;

  if (!session || !Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = Number(
    request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branch") ?? "0",
  );
  const bookingDate = (
    request.nextUrl.searchParams.get("book_date") ?? request.nextUrl.searchParams.get("date") ?? ""
  ).trim();

  if (!Number.isFinite(branchId) || branchId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return NextResponse.json({ error: "invalid branch or date" }, { status: 400 });
  }

  try {
    if (role !== "admin") {
      const accessRows = await query<AccessRow[]>(
        "SELECT branch_id FROM user_in_branch WHERE user_id = ? AND branch_id = ? LIMIT 1",
        [userId, branchId],
      );
      if (accessRows.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const branchRows = await query<BranchRow[]>(
      "SELECT name FROM branches WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [branchId],
    );

    if (branchRows.length === 0) {
      return NextResponse.json({ error: "branch not found" }, { status: 404 });
    }

    const [timeSlots, staffList, bookings, leaves] = await Promise.all([
      query<TimeSlotRow[]>(
        "SELECT id, begin_time, end_time FROM time_slots WHERE branch_id = ? ORDER BY begin_time ASC",
        [branchId],
      ),
      query<StaffRow[]>(
        `SELECT id, staff_code, full_name
         FROM staff
         WHERE branch_id = ? AND status = 'active' AND is_deleted = 0
         ORDER BY staff_code ASC`,
        [branchId],
      ),
      query<BookingRow[]>(
        `SELECT staff_id, time_slot_id, customer_name, customer_phone
         FROM bookings
         WHERE branch_id = ?
           AND booking_date = ?
           AND is_deleted = 0`,
        [branchId, bookingDate],
      ),
      query<LeaveRow[]>(
        `SELECT sl.staff_id
         FROM staff_leaves sl
         JOIN staff s ON s.id = sl.staff_id
         WHERE s.branch_id = ?
           AND sl.leave_date = ?
           AND s.is_deleted = 0`,
        [branchId, bookingDate],
      ),
    ]);

    const bookingMap = new Map<string, { name: string; phone: string }>();
    for (const booking of bookings) {
      bookingMap.set(`${booking.staff_id}-${booking.time_slot_id}`, {
        name: booking.customer_name,
        phone: booking.customer_phone,
      });
    }

    const leaveSet = new Set(leaves.map((leave) => leave.staff_id));
    const slotHeaders = timeSlots.map((slot) => `${formatTime(slot.begin_time)}-${formatTime(slot.end_time)}`);

    const lines: string[][] = [
      [`สาขา: ${branchRows[0].name}`, `วันที่: ${bookingDate}`],
      [],
      ["พนักงาน", ...slotHeaders],
      ...staffList.map((staff) => {
        const staffLabel = `${staff.staff_code} ${staff.full_name}`;
        const slotCells = timeSlots.map((slot) => {
          const booking = bookingMap.get(`${staff.id}-${slot.id}`);
          if (booking) {
            return `${booking.name}\n${booking.phone}`;
          }
          return leaveSet.has(staff.id) ? "ลา" : "";
        });
        return [staffLabel, ...slotCells];
      }),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(lines);
    worksheet["!cols"] = [{ wch: 24 }, ...timeSlots.map(() => ({ wch: 20 }))];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");
    const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const branchSegment = sanitizeFilenameSegment(branchRows[0].name) || `branch-${branchId}`;
    const fileName = `bookings-${branchSegment}-${bookingDate}.xlsx`;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "failed to export bookings" }, { status: 500 });
  }
}
