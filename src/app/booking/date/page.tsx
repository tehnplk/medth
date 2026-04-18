import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";
import BookingTopBar from "@/components/booking-top-bar";
import { MapPin } from "lucide-react";

type SearchParams = Promise<{
  branch?: string | string[] | undefined;
  date?: string | string[] | undefined;
}>;

type BranchRow = {
  id: number;
  name: string;
};

type CountRow = {
  total: number;
};

type BookingCountRow = {
  booking_date_key: string;
  booked_count: number;
};

type LeaveCountRow = {
  leave_date_key: string;
  leave_count: number;
};

type DateItem = {
  key: string;
  dayLabel: string;
  dateLabel: string;
  availableQueues: number;
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

function getBangkokTodayUtcDate(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const formatted = formatter.format(new Date());
  const [year, month, day] = formatted.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function buildDateItems(days: number): DateItem[] {
  const todayUtc = getBangkokTodayUtcDate();
  const list: DateItem[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = new Date(todayUtc);
    date.setUTCDate(todayUtc.getUTCDate() + i);

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const weekday = date.getUTCDay();

    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dateLabel = `${day} ${thaiMonthsShort[month]}`;

    list.push({
      key,
      dayLabel: thaiWeekdays[weekday],
      dateLabel,
      availableQueues: 0,
    });
  }

  return list;
}

export default async function DatePage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const branchParam = getQueryValue(searchParams.branch);
  const dateParam = getQueryValue(searchParams.date);
  const branchId = Number(branchParam);

  let hasDbError = false;
  let branchName = "";

  if (Number.isFinite(branchId) && branchId > 0) {
    try {
      const branches = await query<BranchRow[]>(
        "SELECT id, name FROM branches WHERE id = ? AND is_active = 1 AND is_deleted = 0 LIMIT 1",
        [branchId],
      );
      if (branches.length > 0) {
        branchName = branches[0].name;
      }
    } catch {
      hasDbError = true;
    }
  }

  const dates = buildDateItems(14);
  const startDate = dates[0]?.key ?? "";
  const endDate = dates[dates.length - 1]?.key ?? "";

  if (!hasDbError && branchName && startDate && endDate) {
    try {
      const [staffRows, slotRows, bookingRows, leaveRows] = await Promise.all([
        query<CountRow[]>(
          "SELECT COUNT(*) AS total FROM staff WHERE branch_id = ? AND status = 'active' AND is_deleted = 0",
          [branchId],
        ),
        query<CountRow[]>("SELECT COUNT(*) AS total FROM time_slots WHERE branch_id = ?", [
          branchId,
        ]),
        query<BookingCountRow[]>(
          `SELECT DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date_key, COUNT(*) AS booked_count
           FROM bookings
           WHERE branch_id = ?
             AND booking_date BETWEEN ? AND ?
             AND is_deleted = 0
           GROUP BY DATE_FORMAT(booking_date, '%Y-%m-%d')`,
          [branchId, startDate, endDate],
        ),
        query<LeaveCountRow[]>(
          `SELECT DATE_FORMAT(sl.leave_date, '%Y-%m-%d') AS leave_date_key, COUNT(*) AS leave_count
           FROM staff_leaves sl
           JOIN staff s ON s.id = sl.staff_id
           WHERE s.branch_id = ? AND s.status = 'active'
             AND s.is_deleted = 0
             AND sl.leave_date BETWEEN ? AND ?
           GROUP BY DATE_FORMAT(sl.leave_date, '%Y-%m-%d')`,
          [branchId, startDate, endDate],
        ),
      ]);

      const totalStaff = staffRows[0]?.total ?? 0;
      const totalSlots = slotRows[0]?.total ?? 0;
      const bookedCountMap = new Map(
        bookingRows.map((row) => [row.booking_date_key, Number(row.booked_count) || 0]),
      );
      const leaveCountMap = new Map(
        leaveRows.map((row) => [row.leave_date_key, Number(row.leave_count) || 0]),
      );

      dates.forEach((item) => {
        const bookedCount = bookedCountMap.get(item.key) ?? 0;
        const leaveCount = leaveCountMap.get(item.key) ?? 0;
        const availableStaff = Math.max(totalStaff - leaveCount, 0);
        const maxQueues = availableStaff * totalSlots;
        item.availableQueues = Math.max(maxQueues - bookedCount, 0);
      });
    } catch {
      hasDbError = true;
    }
  }

  const stepLinks = [
    "/booking",
    Number.isFinite(branchId) && branchId > 0
      ? `/booking/date?branch=${branchId}${dateParam ? `&date=${dateParam}` : ""}`
      : null,
    null,
    null,
    null,
  ];

  return (
    <>
      <div className="sticky top-0 z-30 flex-shrink-0 bg-white border-b border-slate-100 shadow-sm">
        <BookingTopBar title="เลือกวันที่" backHref="/booking" />
        <BookingSteps currentStep={2} stepLinks={stepLinks} />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {hasDbError ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 font-medium">
              โหลดข้อมูลวันที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
            </div>
          ) : null}

          {!hasDbError && !branchName ? (
            <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
              ไม่พบสาขาที่คุณเลือก กรุณากลับไปเลือกสาขาใหม่อีกครั้ง
            </div>
          ) : null}

          {!hasDbError && branchName ? (
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200">
                <MapPin className="h-4 w-4 text-sky-600" />
                {branchName}
              </span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {dates.map((item) => {
              const isSelected = item.key === dateParam;
              const isFull = item.availableQueues === 0;

              return (
                <Link
                  key={item.key}
                  href={`/booking/time?branch=${branchId}&date=${item.key}`}
                  className={`group relative flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition-all duration-300 ${
                    isSelected
                      ? "border-sky-500 bg-sky-50 shadow-lg shadow-sky-100 ring-2 ring-sky-500"
                      : "border-slate-200 bg-white hover:border-sky-300 hover:shadow-md"
                  } ${isFull ? "opacity-60 grayscale-[0.5]" : ""}`}
                >
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? "text-sky-700" : "text-slate-400 group-hover:text-sky-600"}`}>
                    {item.dayLabel.replace("วัน", "")}
                  </span>
                  <span className={`text-xl font-black ${isSelected ? "text-sky-900" : "text-slate-900"}`}>
                    {item.dateLabel.split(" ")[0]}
                  </span>
                  <span className={`text-[11px] font-bold ${isSelected ? "text-sky-700" : "text-slate-500"}`}>
                    {item.dateLabel.split(" ")[1]}
                  </span>
                  
                  <div className={`mt-3 w-full rounded-full py-1 text-[10px] font-black tracking-tight ${
                    isFull 
                      ? "bg-slate-100 text-slate-400" 
                      : isSelected 
                        ? "bg-sky-600 text-white" 
                        : "bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition-colors"
                  }`}>
                    {isFull ? "คิวเต็ม" : `ว่าง ${item.availableQueues} คิว`}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
