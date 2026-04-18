import Link from "next/link";
import { Phone, Search } from "lucide-react";
import { query } from "@/lib/db";

type SearchParams = Promise<{
  phone?: string | string[] | undefined;
}>;

type BookingSearchRow = {
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string | Date;
  booking_status: "pending" | "confirmed" | "completed";
  branch_name: string;
  staff_name: string;
  begin_time: string;
  end_time: string;
};

const thaiWeekdays = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
];

const thaiMonthsShort = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function getQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function formatPhoneMask(value: string): string {
  const digits = normalizePhoneDigits(value);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 10);

  if (digits.length <= 3) return p1;
  if (digits.length <= 6) return `${p1}-${p2}`;
  return `${p1}-${p2}-${p3}`;
}

function toIsoDateString(value: string | Date): string {
  if (typeof value === "string") return value;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toThaiDateLabel(value: string | Date): string {
  const isoDate = toIsoDateString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "-";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${thaiWeekdays[date.getUTCDay()]} ที่ ${d} ${thaiMonthsShort[m - 1]} ${y + 543}`;
}

function formatTime(raw: string): string {
  const [hour = "00", minute = "00"] = raw.split(":");
  return `${hour}.${minute}`;
}

export default async function SearchBookingPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const phoneParam = getQueryValue(searchParams.phone);
  const phoneDigits = normalizePhoneDigits(phoneParam);

  let hasDbError = false;
  let results: BookingSearchRow[] = [];

  if (phoneDigits.length === 10) {
    try {
      results = await query<BookingSearchRow[]>(
        `SELECT
          b.booking_code,
          b.customer_name,
          b.customer_phone,
          b.booking_date,
          b.booking_status,
          br.name AS branch_name,
          s.full_name AS staff_name,
          ts.begin_time,
          ts.end_time
        FROM bookings b
        JOIN branches br ON br.id = b.branch_id
        JOIN staff s ON s.id = b.staff_id
        JOIN time_slots ts ON ts.id = b.time_slot_id
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(b.customer_phone, '-', ''), ' ', ''), '(', ''), ')', '') = ?
          AND b.is_deleted = 0
          AND br.is_deleted = 0
          AND s.is_deleted = 0
        ORDER BY b.booking_date DESC, ts.begin_time ASC, b.id DESC
        LIMIT 20`,
        [phoneDigits],
      );
    } catch {
      hasDbError = true;
    }
  }

  const hasSearch = phoneParam.trim().length > 0;
  const canSearch = phoneDigits.length === 10;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-sky-200/80 bg-white/95 p-5 shadow-[0_12px_32px_-18px_rgba(37,99,235,0.24)]">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/booking"
            className="inline-flex rounded-full border border-sky-300 px-3 py-1 text-xs font-semibold text-sky-700"
          >
            กลับหน้าแรก
          </Link>
          <p className="text-sm font-semibold text-sky-800">ค้นหาการจอง</p>
        </div>

        <section className="mt-4 rounded-2xl border border-sky-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-sky-900">
            <Phone className="h-4 w-4 text-sky-600" />
            <span>ค้นหาด้วยเบอร์โทร</span>
          </p>
          <form action="/booking/search-booking" method="GET" className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-sky-900">
                เบอร์โทร
              </span>
              <input
                type="tel"
                name="phone"
                inputMode="numeric"
                placeholder="081-234-5678"
                defaultValue={formatPhoneMask(phoneParam)}
                className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <Search className="h-4 w-4" />
              ค้นหา
            </button>
          </form>
        </section>

        {hasDbError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            โหลดข้อมูลการจองไม่สำเร็จ
          </p>
        ) : null}

        {hasSearch && !canSearch ? (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            กรุณากรอกเบอร์โทร 10 หลัก
          </p>
        ) : null}

        {canSearch ? (
          <section className="mt-4 space-y-3">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
              <p className="text-sm text-sky-800">ผลการค้นหาเบอร์ {formatPhoneMask(phoneDigits)}</p>
              <p className="mt-1 text-xs text-sky-700">
                พบทั้งหมด {results.length} รายการ
              </p>
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-sky-200 bg-white p-4 text-sm text-sky-800">
                ไม่พบรายการจองของเบอร์นี้
              </div>
            ) : null}

            {results.map((booking) => (
              <article
                key={booking.booking_code}
                className="rounded-2xl border border-sky-200 bg-white p-4 shadow-[0_8px_20px_-16px_rgba(37,99,235,0.22)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-sky-950">{booking.branch_name}</p>
                    <p className="mt-1 text-xs text-sky-700">
                      {toThaiDateLabel(booking.booking_date)} | เวลา {formatTime(booking.begin_time)} - {formatTime(booking.end_time)}น.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">
                      {booking.booking_status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 divide-y divide-sky-100 rounded-xl border border-sky-100 bg-sky-50/60">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="w-16 shrink-0 text-sky-700">รหัส</span>
                    <span className="min-w-0 truncate font-semibold text-sky-900">
                      {booking.booking_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="w-16 shrink-0 text-sky-700">ผู้จอง</span>
                    <span className="min-w-0 truncate font-medium text-sky-900">
                      {booking.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="w-16 shrink-0 text-sky-700">พนักงาน</span>
                    <span className="min-w-0 truncate font-medium text-sky-900">
                      {booking.staff_name}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
