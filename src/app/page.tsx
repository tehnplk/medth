import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";

type BranchRow = {
  id: number;
  name: string;
  location_detail: string | null;
  opening_hours: string | null;
  coordinates: string | null;
};

type Branch = {
  id: number;
  name: string;
  locationDetail: string;
  openingHours: string;
  coordinates: string;
};

export default async function Home() {
  let branches: Branch[] = [];
  let hasDbError = false;

  try {
    const rows = await query<BranchRow[]>(
      "SELECT id, name, location_detail, opening_hours, coordinates FROM branches WHERE is_active = 1 ORDER BY id ASC",
    );

    branches = rows.map((row) => ({
      id: row.id,
      name: row.name,
      locationDetail: row.location_detail ?? "-",
      openingHours: row.opening_hours ?? "-",
      coordinates: row.coordinates ?? "-",
    }));
  } catch {
    hasDbError = true;
  }

  const stepLinks = ["/", null, null, null, null];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed_0%,_#ffedd5_38%,_#fed7aa_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-orange-200/80 bg-white/90 p-5 shadow-[0_12px_32px_-18px_rgba(154,52,18,0.45)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="h-[26px] w-[72px]" aria-hidden />
          <p className="text-sm font-semibold text-orange-800">เลือกสาขา</p>
        </div>

        <div className="mt-3">
          <BookingSteps currentStep={1} stepLinks={stepLinks} />
        </div>

        <section className="mt-4 space-y-3">
          {hasDbError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              โหลดข้อมูลสาขาไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล
            </p>
          ) : null}

          {!hasDbError && branches.length === 0 ? (
            <p className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
              ยังไม่มีสาขาในระบบ
            </p>
          ) : null}

          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={`/date?branch=${String(branch.id)}`}
              className="block rounded-2xl border border-orange-200 bg-white p-4 transition hover:border-orange-300 hover:bg-orange-50"
            >
              <p className="text-lg font-semibold text-orange-950">{branch.name}</p>
              <p className="mt-1 text-sm text-orange-900/80">
                โซนที่ตั้ง: {branch.locationDetail}
              </p>
              <p className="mt-1 text-xs text-orange-800/80">
                เวลาเปิด-ปิด: {branch.openingHours}
              </p>
              <p className="mt-1 text-xs text-orange-700/80">
                พิกัด: {branch.coordinates}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
