import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type CountRow = {
  total: number;
};

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

    await query<mysql.ResultSetHeader>(
      `UPDATE branches
       SET name = ?, location_detail = ?, opening_hours = ?, coordinates = ?, is_active = ?
       WHERE id = ?`,
      [name, locationDetail, openingHours, coordinates, isActive, id],
    );

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
    const [staffRows, slotRows, bookingRows] = await Promise.all([
      query<CountRow[]>("SELECT COUNT(*) AS total FROM staff WHERE branch_id = ?", [id]),
      query<CountRow[]>("SELECT COUNT(*) AS total FROM time_slots WHERE branch_id = ?", [id]),
      query<CountRow[]>("SELECT COUNT(*) AS total FROM bookings WHERE branch_id = ?", [id]),
    ]);

    const relatedCount =
      (staffRows[0]?.total ?? 0) + (slotRows[0]?.total ?? 0) + (bookingRows[0]?.total ?? 0);

    if (relatedCount > 0) {
      return NextResponse.json(
        { error: "ลบสาขานี้ไม่ได้ เพราะยังมีพนักงาน เวลาจอง หรือรายการจองอยู่" },
        { status: 409 },
      );
    }

    await query<mysql.ResultSetHeader>("DELETE FROM branches WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบสาขาได้" }, { status: 500 });
  }
}
