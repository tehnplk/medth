import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type BranchStatusRow = {
  id: number;
  name: string;
  is_active: number;
  opening_hours: string | null;
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

function normalizeActive(value: unknown) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

async function getBranchById(id: number) {
  const rows = await query<BranchStatusRow[]>(
    `SELECT id, name, is_active, opening_hours
     FROM branches
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/open-close/[id]">,
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json({ error: "รหัสสาขาไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const isActive = normalizeActive(body.is_active);
    const openingHours = normalizeNullableString(body.opening_hours);

    await query<mysql.ResultSetHeader>(
      `UPDATE branches
       SET is_active = ?, opening_hours = ?
       WHERE id = ?`,
      [isActive, openingHours, id],
    );

    const row = await getBranchById(id);
    return NextResponse.json({ row });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถอัปเดตสถานะสาขาได้" }, { status: 500 });
  }
}
