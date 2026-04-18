import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";
import BookingTopBar from "@/components/booking-top-bar";
import BranchDistance from "@/components/branch-distance";
import ThumbnailPlaceholder from "@/components/thumbnail-placeholder";
import { ChevronRight, Clock, MapPin } from "lucide-react";


type BranchRow = {
  id: number;
  name: string;
  location_detail: string | null;
  opening_hours: string | null;
  coordinates: string | null;
};

type SearchParams = Promise<{
  line_id?: string | string[] | undefined;
}>;

function getQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

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

export default async function Home(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const lineIdParam = getQueryValue(searchParams.line_id);
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
      <div className="sticky top-0 z-30 flex-shrink-0 bg-white border-b border-slate-100 shadow-sm">
        <BookingTopBar title="เลือกสาขา" />
        <BookingSteps currentStep={1} stepLinks={stepLinks} />
      </div>
      
      <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {hasDbError ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">เกิดข้อผิดพลาด</p>
              <p className="mt-1 opacity-80">ไม่สามารถโหลดข้อมูลสาขาได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>
            </div>
          ) : null}

          {!hasDbError && branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <MapPin className="h-10 w-10 text-slate-400" />
              </div>
              <p className="text-lg font-bold text-slate-900">ไม่พบสาขาในระบบ</p>
              <p className="mt-2 text-sm text-slate-500">กรุณาติดต่อเจ้าหน้าที่เพื่อสอบถามข้อมูลเพิ่มเติม</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {branches.map((branch) => (
              <Link
                key={branch.id}
                href={`/booking/date?branch=${String(branch.id)}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100 active:scale-[0.98]"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                   <ThumbnailPlaceholder kind="branch" label={branch.name} />
                </div>
                
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {branch.name}
                    </h3>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-sky-50 group-hover:text-sky-600">
                       <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-2.5 text-sm text-slate-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>{branch.locationDetail}</span>
                    </div>
                    
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{branch.openingHours}</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-5">
                    <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                       <BranchDistance lat={branch.lat} lng={branch.lng} />
                       <span className="text-xs font-bold uppercase tracking-wider text-sky-600">จองเลย</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
