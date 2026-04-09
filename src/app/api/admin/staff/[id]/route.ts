import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type CountRow = {
  total: number;
};

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

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/staff/[id]">,
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

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

    await query<mysql.ResultSetHeader>(
      `UPDATE staff
       SET branch_id = ?, staff_code = ?, full_name = ?, phone = ?, photo_path = ?, skill_note = ?, status = ?
       WHERE id = ?`,
      [branchId, staffCode, fullName, phone, photoPath, skillNote, status, id],
    );

    const row = await getStaffById(id);
    return NextResponse.json({ row });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "รหัสพนักงานซ้ำในสาขาเดียวกัน" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "ไม่สามารถแก้ไขพนักงานได้" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/admin/staff/[id]">,
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const bookings = await query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM bookings WHERE staff_id = ?",
      [id],
    );

    if ((bookings[0]?.total ?? 0) > 0) {
      return NextResponse.json(
        { error: "ลบพนักงานนี้ไม่ได้ เพราะยังมีรายการจองอ้างอิงอยู่" },
        { status: 409 },
      );
    }

    await query<mysql.ResultSetHeader>("DELETE FROM staff WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบพนักงานได้" }, { status: 500 });
  }
}
