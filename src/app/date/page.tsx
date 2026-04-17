import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";
import { ChevronLeft, MapPin } from "lucide-react";

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
        "SELECT id, name FROM branches WHERE id = ? AND is_active = 1 LIMIT 1",
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
          "SELECT COUNT(*) AS total FROM staff WHERE branch_id = ? AND status = 'active'",
          [branchId],
        ),
        query<CountRow[]>("SELECT COUNT(*) AS total FROM time_slots WHERE branch_id = ?", [
          branchId,
        ]),
        query<BookingCountRow[]>(
          `SELECT DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date_key, COUNT(*) AS booked_count
           FROM bookings
           WHERE branch_id = ?
             AND booking_status <> 'cancelled'
             AND booking_date BETWEEN ? AND ?
           GROUP BY DATE_FORMAT(booking_date, '%Y-%m-%d')`,
          [branchId, startDate, endDate],
        ),
        query<LeaveCountRow[]>(
          `SELECT DATE_FORMAT(sl.leave_date, '%Y-%m-%d') AS leave_date_key, COUNT(*) AS leave_count
           FROM staff_leaves sl
           JOIN staff s ON s.id = sl.staff_id
           WHERE s.branch_id = ? AND s.status = 'active'
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
    "/",
    Number.isFinite(branchId) && branchId > 0
      ? `/date?branch=${branchId}${dateParam ? `&date=${dateParam}` : ""}`
      : null,
    null,
    null,
    null,
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-sky-200/80 bg-white/90 p-5 shadow-[0_12px_32px_-18px_rgba(37,99,235,0.24)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-full border border-sky-300 px-4 py-2 text-xs font-semibold text-sky-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            ย้อนกลับ
          </Link>
          <p className="text-sm font-semibold text-sky-800">เลือกวันที่</p>
        </div>

        <div className="mt-3">
          <BookingSteps currentStep={2} stepLinks={stepLinks} />
        </div>

        {hasDbError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
          </p>
        ) : null}

        {!hasDbError && !branchName ? (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            ไม่พบสาขาที่เลือก กรุณาเลือกสาขาใหม่
          </p>
        ) : null}

        {!hasDbError && branchName ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {branchName}
            </span>
          </div>
        ) : null}

        <section className="mt-4 grid grid-cols-2 gap-3">
          {dates.map((item) => {
            const isSelected = item.key === dateParam;
            return (
              <Link
                key={item.key}
                href={`/time?branch=${branchId}&date=${item.key}`}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  isSelected
                    ? "border-sky-500 bg-sky-50 shadow-[0_8px_20px_-14px_rgba(59,130,246,0.45)]"
                    : "border-sky-200 bg-white hover:border-sky-300"
                }`}
              >
                <span className="block text-sm font-semibold text-sky-950">
                  {item.dayLabel}
                </span>
                <span className="mt-1 block text-sm text-sky-800">
                  {item.dateLabel}
                </span>
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                    item.availableQueues === 0
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  คิวว่าง {item.availableQueues} คิว
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
