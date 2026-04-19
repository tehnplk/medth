import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Get date_off dates for a branch
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id");

  if (!branchId) {
    return NextResponse.json({ error: "branch_id is required" }, { status: 400 });
  }

  try {
    const dateOffList = await query<{ date_off: string }[]>(
      "SELECT date_off FROM branch_date_off WHERE branch_id = ? ORDER BY date_off ASC",
      [parseInt(branchId)],
    );

    return NextResponse.json(dateOffList.map((row) => row.date_off));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
