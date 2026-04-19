import { query } from "@/lib/db";
import BookingSteps from "@/components/booking-steps";
import BookingTopBar from "@/components/booking-top-bar";
import { Calendar, Clock, MapPin } from "lucide-react";
import StaffList from "@/components/staff-list";
import SocketLiveRefresh from "@/components/socket-live-refresh";

type SearchParams = Promise<{
  branch?: string | string[] | undefined;
  date?: string | string[] | undefined;
  slot?: string | string[] | undefined;
  line_id?: string | string[] | undefined;
  error?: string | string[] | undefined;
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
  const lineIdParam = getQueryValue(searchParams.line_id);
  const errorParam = getQueryValue(searchParams.error);

  const branchId = Number(branchParam);
  const slotId = Number(slotParam);

  let hasDbError = false;
  let branchName = "";
  let slotLabel = "";
  let staffList: StaffRow[] = [];

  if (Number.isFinite(branchId) && branchId > 0) {
    try {
      const branchRows = await query<BranchRow[]>(
        "SELECT id, name FROM branches WHERE id = ? AND is_active = 1 AND is_deleted = 0 LIMIT 1",
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
               AND b.is_deleted = 0
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
         WHERE s.branch_id = ? AND s.status = 'active' AND s.is_deleted = 0
         ORDER BY s.staff_code ASC`,
        [dateParam, slotId, dateParam, branchId],
      );
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
    Number.isFinite(branchId) && branchId > 0
      ? `/booking/staff?branch=${branchId}&date=${dateParam}${slotParam ? `&slot=${slotParam}` : ""}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`
      : null,
    null,
  ];

  return (
    <>
      <SocketLiveRefresh />
      <div className="sticky top-0 z-30 flex-shrink-0 bg-white border-b border-slate-100 shadow-sm">
        <BookingTopBar
          title="เลือกพนักงาน"
          backHref={`/booking/time?branch=${branchId}&date=${dateParam}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`}
        />
        <BookingSteps currentStep={4} stepLinks={stepLinks} />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {errorParam === "booked" ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-medium">
              ⚠️ พนักงานท่านนี้ถูกจองไปแล้ว กรุณาเลือกพนักงานท่านอื่น
            </div>
          ) : null}
          {hasDbError ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 font-medium">
              โหลดข้อมูลพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
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
              {slotLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200">
                  <Clock className="h-4 w-4 text-amber-600" />
                  {slotLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {!slotLabel ? (
             <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                <Clock className="mb-4 h-12 w-12 opacity-20" />
                <p className="font-medium">กรุณาเลือกช่วงเวลาที่ต้องการเข้ารับบริการก่อน</p>
             </div>
          ) : (
            <StaffList
              initialStaff={staffList}
              branchId={branchId}
              dateParam={dateParam}
              slotId={slotId}
              lineId={lineIdParam}
            />
          )}
        </div>
      </div>
    </>
  );
}
