import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type CountRow = {
  total: number;
};

type TimeSlotRow = {
  id: number;
  branch_id: number;
  begin_time: string;
  end_time: string;
  duration_minutes: number;
  branch_name: string;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeBranchId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePositiveInt(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeTime(value: unknown) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : null;
}

async function getTimeSlotById(id: number) {
  const rows = await query<TimeSlotRow[]>(
    `SELECT
       ts.id,
       ts.branch_id,
       ts.begin_time,
       ts.end_time,
       ts.duration_minutes,
       b.name AS branch_name
     FROM time_slots ts
     JOIN branches b ON b.id = ts.branch_id
     WHERE ts.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/time-slots/[id]">,
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสเวลาจองไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const branchId = normalizeBranchId(body.branch_id);
    const beginTime = normalizeTime(body.begin_time);
    const endTime = normalizeTime(body.end_time);
    const durationMinutes = normalizePositiveInt(body.duration_minutes);

    if (!branchId || !beginTime || !endTime || !durationMinutes) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลเวลาจองให้ครบ" }, { status: 400 });
    }

    if (beginTime >= endTime) {
      return NextResponse.json({ error: "เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด" }, { status: 400 });
    }

    await query<mysql.ResultSetHeader>(
      `UPDATE time_slots
       SET branch_id = ?, begin_time = ?, end_time = ?, duration_minutes = ?
       WHERE id = ?`,
      [branchId, beginTime, endTime, durationMinutes, id],
    );

    const row = await getTimeSlotById(id);
    return NextResponse.json({ row });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถแก้ไขเวลาจองได้" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/admin/time-slots/[id]">,
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสเวลาจองไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const bookings = await query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM bookings WHERE time_slot_id = ?",
      [id],
    );

    if ((bookings[0]?.total ?? 0) > 0) {
      return NextResponse.json(
        { error: "ลบเวลาจองนี้ไม่ได้ เพราะยังมีรายการจองอ้างอิงอยู่" },
        { status: 409 },
      );
    }

    await query<mysql.ResultSetHeader>("DELETE FROM time_slots WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบเวลาจองได้" }, { status: 500 });
  }
}
