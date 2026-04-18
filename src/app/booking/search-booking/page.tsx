import { Calendar, Phone, Search, User } from "lucide-react";
import { query } from "@/lib/db";
import BookingTopBar from "@/components/booking-top-bar";

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
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Phone className="h-5 w-5 text-slate-300" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    inputMode="numeric"
                    placeholder="08X-XXX-XXXX"
                    defaultValue={formatPhoneMask(phoneParam)}
                    autoComplete="off"
                    className="block w-full rounded-2xl border-2 border-slate-300 bg-white py-4 pl-12 pr-4 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100 transition-all shadow-sm"
                  />
                </div>

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
                   ผลการค้นหาสำหรับ <span className="text-sky-600">{formatPhoneMask(phoneDigits)}</span>
                </h3>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                   {results.length} รายการ
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {results.map((booking) => (
                  <article
                    key={booking.booking_code}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-100"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-white">
                             {booking.booking_code}
                          </span>
                          <span className={`${
                            booking.booking_status === 'completed' ? 'text-emerald-600 bg-emerald-50' : 
                            booking.booking_status === 'confirmed' ? 'text-sky-600 bg-sky-50' : 
                            'text-amber-600 bg-amber-50'
                          } text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full`}>
                             {booking.booking_status}
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900">{booking.branch_name}</h4>
                      </div>
                      
                      <div className="flex flex-col items-end">
                         <p className="text-lg font-black text-slate-900">{formatTime(booking.begin_time)} น.</p>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">เวลาเข้ารับบริการ</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-y-4 gap-x-8 border-t border-slate-50 pt-6">
                      <div className="flex items-center gap-3">
                         <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sky-600">
                            <Calendar className="h-5 w-5" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">วันที่</span>
                            <span className="text-base font-bold text-slate-700">{toThaiDateLabel(booking.booking_date)}</span>
                         </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sky-600">
                            <User className="h-5 w-5" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">พนักงาน</span>
                            <span className="text-base font-bold text-slate-700">{booking.staff_name}</span>
                         </div>
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
