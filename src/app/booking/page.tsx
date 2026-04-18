import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";
import BookingTopBar from "@/components/booking-top-bar";
import BranchDistance from "@/components/branch-distance";
import ThumbnailPlaceholder from "@/components/thumbnail-placeholder";


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
  lat: number | null;
  lng: number | null;
};

function parseCoords(raw: string | null): { lat: number | null; lng: number | null } {
  if (!raw) return { lat: null, lng: null };
  const parts = raw.split(",").map((p) => p.trim());
  if (parts.length !== 2) return { lat: null, lng: null };
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { lat: null, lng: null };
  return { lat, lng };
}

export default async function Home() {
  let branches: Branch[] = [];
  let hasDbError = false;

  try {
    const rows = await query<BranchRow[]>(
      "SELECT id, name, location_detail, opening_hours, coordinates FROM branches WHERE is_active = 1 AND is_deleted = 0 ORDER BY id ASC",
    );

    branches = rows.map((row) => {
      const { lat, lng } = parseCoords(row.coordinates);
      return {
        id: row.id,
        name: row.name,
        locationDetail: row.location_detail ?? "-",
        openingHours: row.opening_hours ?? "-",
        lat,
        lng,
      };
    });
  } catch {
    hasDbError = true;
  }

  const stepLinks = ["/booking", null, null, null, null];

  return (
    <>
      <div className="flex-shrink-0 shadow-sm">
        <BookingTopBar title="เลือกสาขา" />
        <BookingSteps currentStep={1} stepLinks={stepLinks} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {hasDbError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              โหลดข้อมูลสาขาไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล
            </p>
          ) : null}

          {!hasDbError && branches.length === 0 ? (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              ยังไม่มีสาขาในระบบ
            </p>
          ) : null}

          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={`/booking/date?branch=${String(branch.id)}`}
              className="block rounded-2xl border border-sky-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50"
            >
              <div className="flex items-start gap-4">
                <ThumbnailPlaceholder kind="branch" label={branch.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-sky-950">{branch.name}</p>
                  <p className="mt-1 text-sm text-sky-900/80">
                    โซนที่ตั้ง: {branch.locationDetail}
                  </p>
                  <p className="mt-1 text-xs text-sky-800/80">
                    เวลาเปิด-ปิด: {branch.openingHours}
                  </p>
                  <p className="mt-1 text-xs text-sky-700/80">
                    <BranchDistance lat={branch.lat} lng={branch.lng} />
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
