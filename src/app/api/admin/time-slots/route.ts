import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type TimeSlotRow = {
  id: number;
  branch_id: number;
  begin_time: string;
  end_time: string;
  duration_minutes: number;
  branch_name: string;
};

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
       AND b.is_deleted = 0
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function POST(request: Request) {
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

    const branchRows = await query<Array<{ total: number }>>(
      "SELECT COUNT(*) AS total FROM branches WHERE id = ? AND is_deleted = 0",
      [branchId],
    );

    if ((branchRows[0]?.total ?? 0) === 0) {
      return NextResponse.json({ error: "ไม่พบสาขาที่เลือก" }, { status: 404 });
    }

    const result = await query<mysql.ResultSetHeader>(
      `INSERT INTO time_slots (branch_id, begin_time, end_time, duration_minutes)
       VALUES (?, ?, ?, ?)`,
      [branchId, beginTime, endTime, durationMinutes],
    );

    const row = await getTimeSlotById(result.insertId);
    return NextResponse.json({ row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเพิ่มเวลาจองได้" }, { status: 500 });
  }
}
