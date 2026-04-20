import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { getAuditUser } from "@/lib/audit-user";

type StaffRow = {
  id: number;
  branch_id: number;
  staff_code: string;
  full_name: string;
  phone: string | null;
  gender: "male" | "female" | "other";
  photo_path: string | null;
  skill_note: string | null;
  status: "active" | "inactive";
  branch_name: string;
};

function normalizeGender(value: unknown): "male" | "female" | "other" {
  return value === "male" || value === "female" ? value : "other";
}

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
       s.gender,
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
    const gender = normalizeGender(body.gender);
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
         WHERE staff_code = ?
           AND is_deleted = 0
           AND id <> ?`,
        [staffCode, id],
      ),
    ]);

    if ((branchRows[0]?.total ?? 0) === 0) {
      return NextResponse.json({ error: "ไม่พบสาขาที่เลือก" }, { status: 404 });
    }

    if ((duplicateRows[0]?.total ?? 0) > 0) {
      return NextResponse.json(
        { error: "รหัสพนักงานนี้ถูกใช้งานแล้ว" },
        { status: 409 },
      );
    }

    const result = await query<mysql.ResultSetHeader>(
      `UPDATE staff
       SET branch_id = ?, staff_code = ?, full_name = ?, phone = ?, gender = ?, photo_path = ?, skill_note = ?, status = ?
       WHERE id = ?
         AND is_deleted = 0`,
      [branchId, staffCode, fullName, phone, gender, photoPath, skillNote, status, id],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    }

    const row = await getStaffById(id);
    return NextResponse.json({ row });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "รหัสพนักงานนี้ถูกใช้งานแล้ว" },
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
    const staffRows = await query<Array<{ full_name: string }>>(
      `SELECT full_name
       FROM staff
       WHERE id = ?
         AND is_deleted = 0
       LIMIT 1`,
      [id],
    );

    const staff = staffRows[0];
    if (!staff) {
      return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    }

    const deleteBy = await getAuditUser();
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE bookings
         SET is_deleted = 1,
             delete_by = ?,
             delete_date_time = NOW(),
             delete_note = ?
         WHERE staff_id = ?
           AND is_deleted = 0`,
        [deleteBy, `ลบพนักงาน: ${staff.full_name}`, id],
      );
      await connection.query(
        `UPDATE staff
         SET is_deleted = 1,
             delete_by = ?,
             delete_date_time = NOW()
         WHERE id = ?
           AND is_deleted = 0`,
        [deleteBy, id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    if (global.io) global.io.emit("refreshBookings");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบพนักงานได้" }, { status: 500 });
  }
}
