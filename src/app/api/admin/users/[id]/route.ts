import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { query } from "@/lib/db";
import { hash } from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    const body = await request.json();
    const { display_name, email, password, role, is_active } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (display_name !== undefined) {
      updates.push("display_name = ?");
      values.push(display_name);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      values.push(email || null);
    }
    if (password) {
      const passwordHash = await hash(password, 10);
      updates.push("password_hash = ?");
      values.push(passwordHash);
    }
    if (role !== undefined) {
      updates.push("role = ?");
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(userId);
    await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    const updatedUser = await query(
      `SELECT id, username, display_name, email, role, is_active, created_at
       FROM users
       WHERE id = ?`,
      [userId],
    );

    return NextResponse.json({ row: (updatedUser as any)[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    // Delete user branch assignments first
    await query(`DELETE FROM user_in_branch WHERE user_id = ?`, [userId]);

    // Delete user
    await query(`DELETE FROM users WHERE id = ?`, [userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: 500 },
    );
  }
}
