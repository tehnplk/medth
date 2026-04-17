import Link from "next/link";
import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";
import { Calendar, ChevronLeft, Clock, MapPin } from "lucide-react";
import ThumbnailPlaceholder from "@/components/thumbnail-placeholder";

type SearchParams = Promise<{
  branch?: string | string[] | undefined;
  date?: string | string[] | undefined;
  slot?: string | string[] | undefined;
}>;

type BranchRow = {
  id: number;
  name: string;
};

type StaffRow = {
  id: number;
  staff_code: string;
  full_name: string;
  phone: string | null;
  skill_note: string | null;
  status: "active" | "inactive";
  is_booked: number;
  is_on_leave: number;
};

type TimeSlotRow = {
  id: number;
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

export default async function StaffPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const branchParam = getQueryValue(searchParams.branch);
  const dateParam = getQueryValue(searchParams.date);
  const slotParam = getQueryValue(searchParams.slot);

  const branchId = Number(branchParam);
  const slotId = Number(slotParam);

  let hasDbError = false;
  let branchName = "";
  let slotLabel = "";
  let staffList: StaffRow[] = [];

  if (Number.isFinite(branchId) && branchId > 0) {
    try {
      const branchRows = await query<BranchRow[]>(
        "SELECT id, name FROM branches WHERE id = ? AND is_active = 1 LIMIT 1",
        [branchId],
      );
      if (branchRows.length > 0) {
        branchName = branchRows[0].name;
      }

      if (Number.isFinite(slotId) && slotId > 0) {
        const slotRows = await query<TimeSlotRow[]>(
          "SELECT id, begin_time, end_time FROM time_slots WHERE id = ? AND branch_id = ? LIMIT 1",
          [slotId, branchId],
        );
        if (slotRows.length > 0) {
          slotLabel = `${formatTime(slotRows[0].begin_time)} - ${formatTime(slotRows[0].end_time)}น.`;
        }
      }

      staffList = await query<StaffRow[]>(
        `SELECT
           s.id,
           s.staff_code,
           s.full_name,
           s.phone,
           s.skill_note,
           s.status,
           EXISTS(
             SELECT 1
             FROM bookings b
             WHERE b.branch_id = s.branch_id
               AND b.booking_date = ?
               AND b.time_slot_id = ?
               AND b.staff_id = s.id
             LIMIT 1
           ) AS is_booked,
           EXISTS(
             SELECT 1
             FROM staff_leaves sl
             WHERE sl.staff_id = s.id
               AND sl.leave_date = ?
             LIMIT 1
           ) AS is_on_leave
         FROM staff s
         WHERE s.branch_id = ? AND s.status = 'active'
         ORDER BY s.staff_code ASC`,
        [dateParam, slotId, dateParam, branchId],
      );
      staffList = [
        ...staffList.filter((s) => s.is_on_leave === 0 && s.is_booked === 0),
        ...staffList.filter((s) => s.is_on_leave === 1),
        ...staffList.filter((s) => s.is_on_leave === 0 && s.is_booked === 1),
      ];
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
    Number.isFinite(branchId) && branchId > 0
      ? `/booking/staff?branch=${branchId}&date=${dateParam}${slotParam ? `&slot=${slotParam}` : ""}`
      : null,
    null,
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-sky-200/80 bg-white/90 p-5 shadow-[0_12px_32px_-18px_rgba(37,99,235,0.24)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/booking/time?branch=${branchId}&date=${dateParam}`}
            className="inline-flex items-center gap-1 rounded-full border border-sky-300 px-4 py-2 text-xs font-semibold text-sky-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            ย้อนกลับ
          </Link>
          <p className="text-sm font-semibold text-sky-800">เลือกพนักงาน</p>
        </div>

        <div className="mt-3">
          <BookingSteps currentStep={4} stepLinks={stepLinks} />
        </div>

        {hasDbError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
          </p>
        ) : null}

        {!hasDbError && !branchName ? (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            ไม่พบข้อมูลที่เลือก กรุณาเริ่มใหม่
          </p>
        ) : null}

        {!hasDbError && branchName ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {branchName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {thaiDateLabel}
            </span>
            {slotLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {slotLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {slotLabel ? null : (
          <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            กรุณาเลือกช่วงเวลาก่อน
          </p>
        )}

        {slotLabel ? (
          <section className="mt-4 grid grid-cols-1 gap-3">
            {staffList.length === 0 ? (
              <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                ยังไม่มีพนักงานพร้อมให้บริการในสาขานี้
              </p>
            ) : null}

            {staffList.map((staff) => {
              const isBooked = staff.is_booked === 1;
              const isOnLeave = staff.is_on_leave === 1;
              const isDisabled = isBooked || isOnLeave;
              const card = (
                <div
                  className={`relative overflow-hidden rounded-2xl border px-4 py-3 transition ${
                    isDisabled
                      ? "border-sky-100 bg-sky-50/70 opacity-75"
                      : "border-sky-200 bg-white hover:border-sky-300 hover:bg-sky-50"
                  }`}
                >
                  {isOnLeave && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="rotate-[-28deg] rounded border-2 border-red-400 px-3 py-1 text-lg font-black tracking-widest text-red-400 opacity-60 select-none">
                        ลา
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <ThumbnailPlaceholder kind="staff" label={staff.full_name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-sky-950">
                        {staff.full_name}
                      </p>
                      <p className="mt-1 text-xs text-sky-800/80">
                        รหัส: {staff.staff_code}
                      </p>
                      <p className="mt-1 text-xs text-sky-800/80">
                        ทักษะ: {staff.skill_note ?? "-"}
                      </p>
                      <p className="mt-1 text-xs text-sky-700/80">
                        โทร: {staff.phone ?? "-"}
                      </p>
                      {isBooked && !isOnLeave ? (
                        <p className="mt-2 text-xs font-semibold text-sky-600">จองแล้ว</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );

              return isDisabled ? (
                <div key={staff.id}>{card}</div>
              ) : (
                <Link
                  key={staff.id}
                  href={`/booking/confirm?branch=${branchId}&date=${dateParam}&slot=${slotId}&staff=${staff.id}`}
                  className="rounded-2xl border border-transparent bg-transparent"
                >
                  {card}
                </Link>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}
