import { Calendar, Clock, MapPin, Phone, Search, User } from "lucide-react";
import { query } from "@/lib/db";
import BookingTopBar from "@/components/booking-top-bar";
import PhoneSearchInput from "@/components/phone-search-input";

type SearchParams = Promise<{
  phone?: string | string[] | undefined;
  line_id?: string | string[] | undefined;
}>;

type BookingSearchRow = {
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string | Date;
  booking_status: "pending" | "confirmed" | "completed";
  is_deleted: number;
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
  const lineIdParam = getQueryValue(searchParams.line_id).trim();
  const phoneDigits = normalizePhoneDigits(phoneParam);

  let hasDbError = false;
  let results: BookingSearchRow[] = [];

  const selectColumns = `
      b.booking_code,
      b.customer_name,
      b.customer_phone,
      b.booking_date,
      b.booking_status,
      b.is_deleted,
      br.name AS branch_name,
      s.full_name AS staff_name,
      ts.begin_time,
      ts.end_time
    FROM bookings b
    JOIN branches br ON br.id = b.branch_id
    JOIN staff s ON s.id = b.staff_id
    JOIN time_slots ts ON ts.id = b.time_slot_id`;

  if (lineIdParam) {
    try {
      results = await query<BookingSearchRow[]>(
        `SELECT ${selectColumns}
        WHERE b.line_id = ?
          AND br.is_deleted = 0
          AND s.is_deleted = 0
        ORDER BY b.booking_date DESC, ts.begin_time ASC, b.id DESC
        LIMIT 20`,
        [lineIdParam],
      );
    } catch {
      hasDbError = true;
    }
  } else if (phoneDigits.length === 10) {
    try {
      results = await query<BookingSearchRow[]>(
        `SELECT ${selectColumns}
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(b.customer_phone, '-', ''), ' ', ''), '(', ''), ')', '') = ?
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

  const canSearch = phoneDigits.length === 10 || lineIdParam.length > 0;

  return (
    <>
      <div className="sticky top-0 z-30 flex-shrink-0 bg-white border-b border-slate-100 shadow-sm">
        <BookingTopBar title="ค้นหาการจอง" backHref="/booking" />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-slate-900 px-6 py-6 text-white text-center">
                   <h3 className="flex items-center justify-center gap-2 text-2xl font-black">
                     <Phone className="h-6 w-6 text-sky-400" />
                     เบอร์โทรศัพท์
                   </h3>
                </div>
            
            <div className="p-6">
              <form action="/booking/search-booking" method="GET" className="space-y-4">
                <PhoneSearchInput defaultValue={phoneParam} />

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-sky-200 transition-all hover:bg-sky-700 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Search className="h-5 w-5" />
                  ค้นหารายการจอง
                </button>
              </form>
            </div>
          </section>

          {canSearch ? (
            <div className="mt-10 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-900">
                   ผลการค้นหาสำหรับ{" "}
                   <span className="text-sky-600">
                     {lineIdParam ? "บัญชีไลน์" : formatPhoneMask(phoneDigits)}
                   </span>
                </h3>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                   {results.length} รายการ
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {results.map((booking) => (
                  <article
                    key={booking.booking_code}
                    className={`group relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 ${
                      booking.is_deleted === 1
                        ? "border-slate-200 bg-slate-100 [&_*:not(.cancel-badge)]:opacity-65"
                        : "border-slate-200 bg-white hover:border-sky-300 hover:shadow-xl hover:shadow-sky-100"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {booking.is_deleted === 1 ? (
                        <span className="cancel-badge text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-red-600 bg-red-50 border-2 border-red-600">
                          ยกเลิกแล้ว
                        </span>
                      ) : booking.booking_status !== "pending" ? (
                        <span className={`${
                          booking.booking_status === 'completed' ? 'text-emerald-600 bg-emerald-50 border-emerald-600' :
                          'text-sky-600 bg-sky-50 border-sky-600'
                        } text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-2`}>
                           {booking.booking_status}
                        </span>
                      ) : null}
                      <span className="ml-auto text-sm font-black text-slate-900">
                         {booking.customer_name}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-sky-600" />
                        <span className="text-sm font-bold text-slate-900">{booking.branch_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-sky-600" />
                        <span className="text-sm font-bold text-slate-900">{toThaiDateLabel(booking.booking_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-sky-600" />
                        <span className="text-sm font-bold text-slate-900">{booking.staff_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0 text-sky-600" />
                        <span className="text-sm font-bold text-slate-900">
                          {formatTime(booking.begin_time)} - {formatTime(booking.end_time)} น.
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
