import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";
import BookingTopBar from "@/components/booking-top-bar";
import { Calendar, ChevronRight, Clock, MapPin } from "lucide-react";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
  branch?: string | string[] | undefined;
  date?: string | string[] | undefined;
  slot?: string | string[] | undefined;
  line_id?: string | string[] | undefined;
}>;

type BranchRow = {
  id: number;
  name: string;
};

type CountRow = {
  total: number;
};

type BookingCountRow = {
  time_slot_id: number;
  booked_count: number;
};

type LeaveCountRow = {
  total: number;
};

type DateOffCountRow = {
  total: number;
};

type TimeSlotRow = {
  id: number;
  begin_time: string;
  end_time: string;
  available_staff_count: number;
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

function formatTime(raw: string): string {
  const [hour = "00", minute = "00"] = raw.split(":");
  return `${hour}.${minute}`;
}

function toThaiDateLabel(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "-";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = thaiWeekdays[date.getUTCDay()];
  const label = `${d} ${thaiMonthsShort[m - 1]} ${y + 543}`;
  return `${weekday} ที่ ${label}`;
}

export default async function TimePage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const branchParam = getQueryValue(searchParams.branch);
  const dateParam = getQueryValue(searchParams.date);
  const slotParam = getQueryValue(searchParams.slot);
  const lineIdParam = getQueryValue(searchParams.line_id);
  const branchId = Number(branchParam);
  const selectedSlotId = Number(slotParam);

  if (!(Number.isFinite(branchId) && branchId > 0)) {
    redirect("/booking");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    redirect(`/booking/date?branch=${branchId}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`);
  }

  let hasDbError = false;
  let branchName = "";
  let slots: TimeSlotRow[] = [];
  let isBranchDateOff = false;

  try {
    const branches = await query<BranchRow[]>(
      "SELECT id, name FROM branches WHERE id = ? AND is_active = 1 AND is_deleted = 0 LIMIT 1",
      [branchId],
    );
    if (branches.length > 0) {
      branchName = branches[0].name;
      slots = await query<TimeSlotRow[]>(
        "SELECT id, begin_time, end_time, 0 AS available_staff_count FROM time_slots WHERE branch_id = ? ORDER BY begin_time ASC",
        [branchId],
      );
    }
  } catch {
    hasDbError = true;
  }

  if (!hasDbError && !branchName) {
    redirect("/booking");
  }

  if (!hasDbError && branchName && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    try {
      const [dateOffRows, staffRows, bookingRows, leaveRows] = await Promise.all([
        query<DateOffCountRow[]>(
          "SELECT COUNT(*) AS total FROM branch_date_off WHERE branch_id = ? AND date_off = ?",
          [branchId, dateParam],
        ),
        query<CountRow[]>(
          "SELECT COUNT(*) AS total FROM staff WHERE branch_id = ? AND status = 'active' AND is_deleted = 0",
          [branchId],
        ),
        query<BookingCountRow[]>(
          `SELECT time_slot_id, COUNT(*) AS booked_count
           FROM bookings
           WHERE branch_id = ?
             AND booking_date = ?
             AND is_deleted = 0
           GROUP BY time_slot_id`,
          [branchId, dateParam],
        ),
        query<LeaveCountRow[]>(
          `SELECT COUNT(*) AS total
           FROM staff_leaves sl
           JOIN staff s ON s.id = sl.staff_id
           WHERE s.branch_id = ? AND s.status = 'active'
             AND s.is_deleted = 0
             AND sl.leave_date = ?`,
          [branchId, dateParam],
        ),
      ]);

      isBranchDateOff = (dateOffRows[0]?.total ?? 0) > 0;

      if (isBranchDateOff) {
        slots = [];
      } else {
        const totalStaff = staffRows[0]?.total ?? 0;
        const leaveCount = leaveRows[0]?.total ?? 0;
        const availableStaff = Math.max(totalStaff - leaveCount, 0);
        const bookedCountMap = new Map(
          bookingRows.map((row) => [row.time_slot_id, Number(row.booked_count) || 0]),
        );

        slots = slots.map((slot) => {
          const bookedCount = bookedCountMap.get(slot.id) ?? 0;
          return {
            ...slot,
            available_staff_count: Math.max(availableStaff - bookedCount, 0),
          };
        });
      }
    } catch {
      hasDbError = true;
    }
  }

  const thaiDateLabel = toThaiDateLabel(dateParam);
  const stepLinks = [
    "/booking",
    Number.isFinite(branchId) && branchId > 0
      ? `/booking/date?branch=${branchId}${dateParam ? `&date=${dateParam}` : ""}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`
      : null,
    Number.isFinite(branchId) && branchId > 0 && dateParam
      ? `/booking/time?branch=${branchId}&date=${dateParam}${slotParam ? `&slot=${slotParam}` : ""}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`
      : null,
    null,
    null,
  ];

  return (
    <>
      <div className="sticky top-0 z-30 flex-shrink-0 bg-white border-b border-slate-100 shadow-sm">
        <BookingTopBar
          title="เลือกเวลา"
          backHref={`/booking/date?branch=${branchId}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`}
        />
        <BookingSteps currentStep={3} stepLinks={stepLinks} />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {hasDbError ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 font-medium">
              โหลดข้อมูลช่วงเวลาไม่สำเร็จ กรุณาลองใหมีกครั้ง
            </div>
          ) : null}

          {!hasDbError && isBranchDateOff ? (
            <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700 font-medium">
              วันที่เลือกเป็นวันหยุดของสาขา ไม่สามารถจองคิวได้
            </div>
          ) : null}

          {!hasDbError && branchName ? (
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200">
                <MapPin className="h-4 w-4 text-sky-600" />
                {branchName}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200">
                <Calendar className="h-4 w-4 text-emerald-600" />
                {thaiDateLabel}
              </span>
            </div>
          ) : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {slots.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500">
                   <Clock className="mx-auto mb-4 h-10 w-10 opacity-20" />
                   <p>ไม่มีช่วงเวลาเปิดให้บริการในวันที่เลือก</p>
                </div>
              ) : null}

              {slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                const isFull = slot.available_staff_count === 0;
                const label = `${formatTime(slot.begin_time)} - ${formatTime(slot.end_time)}น.`;
                
                return (
                  <Link
                    key={slot.id}
                    href={`/booking/staff?branch=${branchId}&date=${dateParam}&slot=${slot.id}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`}
                    className={`group relative flex items-center justify-between rounded-2xl border p-5 transition-all duration-300 ${
                      isSelected
                        ? "border-sky-500 bg-sky-50 shadow-lg shadow-sky-100 ring-2 ring-sky-500"
                        : "border-slate-200 bg-white hover:border-sky-300 hover:shadow-md"
                    } ${isFull ? "opacity-60 grayscale-[0.5]" : ""}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className={`text-base font-black ${isSelected ? "text-sky-900" : "text-slate-900"}`}>
                        {label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${isFull ? "bg-red-400" : "bg-emerald-500"}`} />
                        <span className={`text-[11px] font-bold ${isSelected ? "text-sky-700" : "text-slate-500"}`}>
                          {isFull ? "คิวเต็มแล้ว" : `ว่าง ${slot.available_staff_count} ท่าน`}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                       isSelected ? "bg-sky-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-sky-600 group-hover:text-white"
                    }`}>
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </Link>
                );
              })}
            </section>
        </div>
      </div>
    </>
  );
}

