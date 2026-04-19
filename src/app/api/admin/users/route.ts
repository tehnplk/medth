import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { query } from "@/lib/db";
import { hash } from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await query(
      `SELECT id, username, display_name, email, role, is_active, created_at
       FROM users
       ORDER BY id ASC`,
    );
    return NextResponse.json({ rows: users });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { username, display_name, email, password, role, is_active } = body;

    if (!username || !display_name || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const passwordHash = await hash(password, 10);

    const result = await query(
      `INSERT INTO users (username, display_name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, display_name, email || null, passwordHash, role, is_active ? 1 : 0],
    );

    const insertId = (result as any).insertId;
    const newUser = await query(
      `SELECT id, username, display_name, email, role, is_active, created_at
       FROM users
       WHERE id = ?`,
      [insertId],
    );

    return NextResponse.json({ row: (newUser as any)[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 },
    );
  }
}
