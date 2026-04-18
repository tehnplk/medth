import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { getAuditUser } from "@/lib/audit-user";

type BranchRow = {
  id: number;
  name: string;
  location_detail: string | null;
  opening_hours: string | null;
  coordinates: string | null;
  is_active: number;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  const text = normalizeString(value);
  return text.length > 0 ? text : null;
}

function normalizeActive(value: unknown) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getBranchById(id: number) {
  const rows = await query<BranchRow[]>(
    `SELECT id, name, location_detail, opening_hours, coordinates, is_active
     FROM branches
     WHERE id = ?
       AND is_deleted = 0
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/branches/[id]">,
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสสาขาไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const name = normalizeString(body.name);
    const locationDetail = normalizeNullableString(body.location_detail);
    const openingHours = normalizeNullableString(body.opening_hours);
    const coordinates = normalizeNullableString(body.coordinates);
    const isActive = normalizeActive(body.is_active);

    if (!name) {
      return NextResponse.json({ error: "กรุณากรอกชื่อสาขา" }, { status: 400 });
    }

    const result = await query<mysql.ResultSetHeader>(
      `UPDATE branches
       SET name = ?, location_detail = ?, opening_hours = ?, coordinates = ?, is_active = ?
       WHERE id = ?
         AND is_deleted = 0`,
      [name, locationDetail, openingHours, coordinates, isActive, id],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "ไม่พบสาขา" }, { status: 404 });
    }

    const row = await getBranchById(id);
    return NextResponse.json({ row });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถแก้ไขสาขาได้" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/admin/branches/[id]">,
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสสาขาไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const branchRows = await query<Array<{ name: string }>>(
      `SELECT name
       FROM branches
       WHERE id = ?
         AND is_deleted = 0
       LIMIT 1`,
      [id],
    );

    const branch = branchRows[0];
    if (!branch) {
      return NextResponse.json({ error: "ไม่พบสาขา" }, { status: 404 });
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
         WHERE branch_id = ?
           AND is_deleted = 0`,
        [deleteBy, `ลบสาขา: ${branch.name}`, id],
      );
      await connection.query(
        `UPDATE branches
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
    
    // @ts-expect-error global.io exists in background server
    if (global.io) global.io.emit("refreshBookings");
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบสาขาได้" }, { status: 500 });
  }
}
