import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";
import BookingTopBar from "@/components/booking-top-bar";
import { Calendar, MapPin } from "lucide-react";

type SearchParams = Promise<{
  branch?: string | string[] | undefined;
  date?: string | string[] | undefined;
  slot?: string | string[] | undefined;
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
  const branchId = Number(branchParam);
  const selectedSlotId = Number(slotParam);

  let hasDbError = false;
  let branchName = "";
  let slots: TimeSlotRow[] = [];

  if (Number.isFinite(branchId) && branchId > 0) {
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
  }

  if (!hasDbError && branchName && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    try {
      const [staffRows, bookingRows, leaveRows] = await Promise.all([
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
    } catch {
      hasDbError = true;
    }
  }

  const thaiDateLabel = toThaiDateLabel(dateParam);
  const stepLinks = [
    "/booking",
    Number.isFinite(branchId) && branchId > 0
      ? `/booking/date?branch=${branchId}${dateParam ? `&date=${dateParam}` : ""}`
      : null,
    Number.isFinite(branchId) && branchId > 0 && dateParam
      ? `/booking/time?branch=${branchId}&date=${dateParam}${slotParam ? `&slot=${slotParam}` : ""}`
      : null,
    null,
    null,
  ];

  return (
    <>
      <div className="flex-shrink-0 shadow-sm">
        <BookingTopBar title="เลือกเวลา" backHref={`/booking/date?branch=${branchId}`} />
        <BookingSteps currentStep={3} stepLinks={stepLinks} />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        {hasDbError ? (
          <p className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
          </p>
        ) : null}

        {!hasDbError && !branchName ? (
          <p className="mx-4 mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            ไม่พบสาขาที่เลือก กรุณาเลือกสาขาใหม่
          </p>
        ) : null}

        {!hasDbError && branchName ? (
          <div className="mb-3 flex flex-wrap gap-2 px-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {branchName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {thaiDateLabel}
            </span>
          </div>
        ) : null}

        {dateParam ? null : (
          <p className="mx-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            กรุณาเลือกวันที่ก่อน
          </p>
        )}

        {dateParam ? (
          <section className="grid grid-cols-2 gap-2 px-3">
            {slots.length === 0 ? (
              <p className="col-span-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                ยังไม่มีช่วงเวลาในสาขานี้
              </p>
            ) : null}

            {slots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const label = `${formatTime(slot.begin_time)} - ${formatTime(slot.end_time)}น.`;
              return (
                <Link
                  key={slot.id}
                  href={`/booking/staff?branch=${branchId}&date=${dateParam}&slot=${slot.id}`}
                  className={`rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition ${
                    isSelected
                      ? "border-sky-500 bg-sky-50 text-sky-900 shadow-[0_8px_20px_-14px_rgba(59,130,246,0.45)]"
                      : "border-sky-200 bg-white text-sky-800 hover:border-sky-300"
                  }`}
                >
                  <span className="block">{label}</span>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                      slot.available_staff_count === 0
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    ว่าง {slot.available_staff_count} คน
                  </span>
                </Link>
              );
            })}
          </section>
        ) : null}
      </div>
    </>
  );
}
