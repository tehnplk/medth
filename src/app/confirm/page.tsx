import Link from "next/link";
import BookingSteps from "@/components/booking-steps";
import ConfirmBookingForm from "@/components/confirm-booking-form";
import { query } from "@/lib/db";

type SearchParams = Promise<{
  branch?: string | string[] | undefined;
  date?: string | string[] | undefined;
  slot?: string | string[] | undefined;
  staff?: string | string[] | undefined;
}>;

type BranchRow = { id: number; name: string };
type TimeSlotRow = { id: number; begin_time: string; end_time: string };
type StaffRow = { id: number; full_name: string; is_booked: number };

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

export default async function ConfirmPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const branchParam = getQueryValue(searchParams.branch);
  const dateParam = getQueryValue(searchParams.date);
  const slotParam = getQueryValue(searchParams.slot);
  const staffParam = getQueryValue(searchParams.staff);

  const branchId = Number(branchParam);
  const slotId = Number(slotParam);
  const staffId = Number(staffParam);

  let hasDbError = false;
  let branchName = "-";
  let slotLabel = "-";
  let staffName = "-";

  if (Number.isFinite(branchId) && branchId > 0) {
    try {
      const branchRows = await query<BranchRow[]>(
        "SELECT id, name FROM branches WHERE id = ? AND is_active = 1 LIMIT 1",
        [branchId],
      );
      if (branchRows.length > 0) branchName = branchRows[0].name;

      if (Number.isFinite(slotId) && slotId > 0) {
        const slotRows = await query<TimeSlotRow[]>(
          "SELECT id, begin_time, end_time FROM time_slots WHERE id = ? AND branch_id = ? LIMIT 1",
          [slotId, branchId],
        );
        if (slotRows.length > 0) {
          slotLabel = `${formatTime(slotRows[0].begin_time)} - ${formatTime(slotRows[0].end_time)}น.`;
        }
      }

      if (Number.isFinite(staffId) && staffId > 0) {
        const staffRows = await query<StaffRow[]>(
          `SELECT
             s.id,
             s.full_name,
             EXISTS(
               SELECT 1
               FROM bookings b
               WHERE b.branch_id = s.branch_id
                 AND b.booking_date = ?
                 AND b.time_slot_id = ?
                 AND b.staff_id = s.id
                 AND b.booking_status <> 'cancelled'
               LIMIT 1
             ) AS is_booked
           FROM staff s
           WHERE s.id = ? AND s.branch_id = ? AND s.status = 'active'
           LIMIT 1`,
          [dateParam, slotId, staffId, branchId],
        );
        if (staffRows.length > 0 && staffRows[0].is_booked === 0) staffName = staffRows[0].full_name;
      }
    } catch {
      hasDbError = true;
    }
  }

  const thaiDateLabel = toThaiDateLabel(dateParam);
  const bookingReady =
    !hasDbError &&
    branchName !== "-" &&
    slotLabel !== "-" &&
    staffName !== "-" &&
    thaiDateLabel !== "-";
  const stepLinks = [
    "/",
    Number.isFinite(branchId) && branchId > 0
      ? `/date?branch=${branchId}${dateParam ? `&date=${dateParam}` : ""}`
      : null,
    Number.isFinite(branchId) && branchId > 0 && dateParam
      ? `/time?branch=${branchId}&date=${dateParam}${slotParam ? `&slot=${slotParam}` : ""}`
      : null,
    Number.isFinite(branchId) && branchId > 0
      ? `/staff?branch=${branchId}&date=${dateParam}${slotParam ? `&slot=${slotParam}` : ""}`
      : null,
    Number.isFinite(branchId) && branchId > 0
      ? `/confirm?branch=${branchId}&date=${dateParam}&slot=${slotParam}${staffParam ? `&staff=${staffParam}` : ""}`
      : null,
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-sky-200/80 bg-white/90 p-5 shadow-[0_12px_32px_-18px_rgba(37,99,235,0.24)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/staff?branch=${branchId}&date=${dateParam}&slot=${slotId}`}
            className="inline-flex rounded-full border border-sky-300 px-3 py-1 text-xs font-semibold text-sky-700"
          >
            ย้อนกลับ
          </Link>
          <p className="text-sm font-semibold text-sky-800">ยืนยัน</p>
        </div>

        <div className="mt-3">
          <BookingSteps currentStep={5} stepLinks={stepLinks} />
        </div>

        {hasDbError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
          </p>
        ) : null}

        <section className="mt-3 rounded-2xl border border-sky-200 bg-white p-4">
          <p className="text-sm font-semibold text-sky-900">ยืนยันการจอง</p>

          <div className="mt-2 divide-y divide-sky-100 rounded-xl border border-sky-100 bg-sky-50/60">
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-14 shrink-0 text-sky-700">สาขา</span>
              <span className="min-w-0 truncate font-medium text-sky-900">
                {branchName}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-14 shrink-0 text-sky-700">วันที่</span>
              <span className="min-w-0 truncate font-medium text-sky-900">
                {thaiDateLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-14 shrink-0 text-sky-700">เวลา</span>
              <span className="min-w-0 truncate font-medium text-sky-900">
                {slotLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-14 shrink-0 text-sky-700">พนักงาน</span>
              <span className="min-w-0 truncate font-medium text-sky-900">
                {staffName}
              </span>
            </div>
          </div>
        </section>

        <ConfirmBookingForm
          bookingReady={bookingReady}
          branch={branchParam}
          date={dateParam}
          slot={slotParam}
          staff={staffParam}
        />
      </div>
    </main>
  );
}
