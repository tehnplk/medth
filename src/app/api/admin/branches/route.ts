import type mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

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

export async function POST(request: Request) {
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
      `INSERT INTO branches (name, location_detail, opening_hours, coordinates, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, locationDetail, openingHours, coordinates, isActive],
    );

    const row = await getBranchById(result.insertId);
    return NextResponse.json({ row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเพิ่มสาขาได้" }, { status: 500 });
  }
}
