import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";

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
      const [staffRows, slotRows, bookingRows] = await Promise.all([
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
      ]);

      const totalStaff = staffRows[0]?.total ?? 0;
      const totalSlots = slotRows[0]?.total ?? 0;
      const maxQueuesPerDate = Math.max(totalStaff * totalSlots, 0);
      const bookedCountMap = new Map(
        bookingRows.map((row) => [row.booking_date_key, Number(row.booked_count) || 0]),
      );

      dates.forEach((item) => {
        const bookedCount = bookedCountMap.get(item.key) ?? 0;
        item.availableQueues = Math.max(maxQueuesPerDate - bookedCount, 0);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed_0%,_#ffedd5_38%,_#fed7aa_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-orange-200/80 bg-white/90 p-5 shadow-[0_12px_32px_-18px_rgba(154,52,18,0.45)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex rounded-full border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-700"
          >
            ย้อนกลับ
          </Link>
          <p className="text-sm font-semibold text-orange-800">เลือกวันที่</p>
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
          <p className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
            ไม่พบสาขาที่เลือก กรุณาเลือกสาขาใหม่
          </p>
        ) : null}

        {!hasDbError && branchName ? (
          <p className="mt-3 text-sm text-orange-900/80">สาขา: {branchName}</p>
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
                    ? "border-orange-500 bg-orange-50 shadow-[0_8px_20px_-14px_rgba(194,65,12,0.7)]"
                    : "border-orange-200 bg-white hover:border-orange-300"
                }`}
              >
                <span className="block text-sm font-semibold text-orange-950">
                  {item.dayLabel}
                </span>
                <span className="mt-1 block text-sm text-orange-800">
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
