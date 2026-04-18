import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type StaffRow = {
  id: number;
  branch_id: number;
  staff_code: string;
  full_name: string;
  phone: string | null;
  photo_path: string | null;
  skill_note: string | null;
  status: "active" | "inactive";
  branch_name: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  const text = normalizeString(value);
  return text.length > 0 ? text : null;
}

function normalizeStatus(value: unknown): "active" | "inactive" {
  return value === "inactive" ? "inactive" : "active";
}

function normalizeBranchId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getStaffById(id: number) {
  const rows = await query<StaffRow[]>(
    `SELECT
       s.id,
       s.branch_id,
       s.staff_code,
       s.full_name,
       s.phone,
       s.photo_path,
       s.skill_note,
       s.status,
       b.name AS branch_name
     FROM staff s
     JOIN branches b ON b.id = s.branch_id
     WHERE s.id = ?
       AND s.is_deleted = 0
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
    const staffCode = normalizeString(body.staff_code);
    const fullName = normalizeString(body.full_name);
    const phone = normalizeNullableString(body.phone);
    const photoPath = normalizeNullableString(body.photo_path);
    const skillNote = normalizeNullableString(body.skill_note);
    const status = normalizeStatus(body.status);

    if (!branchId) {
      return NextResponse.json({ error: "กรุณาเลือกสาขา" }, { status: 400 });
    }

    if (!staffCode || !fullName) {
      return NextResponse.json({ error: "กรุณากรอกรหัสและชื่อพนักงาน" }, { status: 400 });
    }

    const [branchRows, duplicateRows] = await Promise.all([
      query<Array<{ total: number }>>(
        "SELECT COUNT(*) AS total FROM branches WHERE id = ? AND is_deleted = 0",
        [branchId],
      ),
      query<Array<{ total: number }>>(
        `SELECT COUNT(*) AS total
         FROM staff
         WHERE branch_id = ?
           AND staff_code = ?
           AND is_deleted = 0`,
        [branchId, staffCode],
      ),
    ]);

    if ((branchRows[0]?.total ?? 0) === 0) {
      return NextResponse.json({ error: "ไม่พบสาขาที่เลือก" }, { status: 404 });
    }

    if ((duplicateRows[0]?.total ?? 0) > 0) {
      return NextResponse.json(
        { error: "รหัสพนักงานซ้ำในสาขาเดียวกัน" },
        { status: 409 },
      );
    }

    const result = await query<mysql.ResultSetHeader>(
      `INSERT INTO staff (branch_id, staff_code, full_name, phone, photo_path, skill_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [branchId, staffCode, fullName, phone, photoPath, skillNote, status],
    );

    const row = await getStaffById(result.insertId);
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "ไม่สามารถเพิ่มพนักงานได้" }, { status: 500 });
  }
}
