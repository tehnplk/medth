import BookingSteps from "@/components/booking-steps";
import BookingTopBar from "@/components/booking-top-bar";
import ConfirmBookingForm from "@/components/confirm-booking-form";
import { query } from "@/lib/db";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
  branch?: string | string[] | undefined;
  date?: string | string[] | undefined;
  slot?: string | string[] | undefined;
  staff?: string | string[] | undefined;
  line_id?: string | string[] | undefined;
}>;

type BranchRow = { id: number; name: string };
type TimeSlotRow = { id: number; begin_time: string; end_time: string };
type StaffRow = { id: number; full_name: string; staff_code: string; is_booked: number };

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
  const lineIdParam = getQueryValue(searchParams.line_id);

  const branchId = Number(branchParam);
  const slotId = Number(slotParam);
  const staffId = Number(staffParam);

  if (
    !(Number.isFinite(branchId) && branchId > 0) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateParam) ||
    !(Number.isFinite(slotId) && slotId > 0) ||
    !(Number.isFinite(staffId) && staffId > 0)
  ) {
    redirect("/booking");
  }

  let hasDbError = false;
  let branchName = "-";
  let slotLabel = "-";
  let staffName = "-";
  let staffCode = "-";
  let staffIsBooked = 0;
  let ownBookingCode = "";

  if (Number.isFinite(branchId) && branchId > 0) {
    try {
      const branchRows = await query<BranchRow[]>(
        "SELECT id, name FROM branches WHERE id = ? AND is_active = 1 AND is_deleted = 0 LIMIT 1",
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
             s.staff_code,
             EXISTS(
               SELECT 1
               FROM bookings b
               WHERE b.branch_id = s.branch_id
                 AND b.booking_date = ?
                 AND b.time_slot_id = ?
                 AND b.staff_id = s.id
                 AND b.is_deleted = 0
               LIMIT 1
             ) AS is_booked
           FROM staff s
           WHERE s.id = ? AND s.branch_id = ? AND s.status = 'active' AND s.is_deleted = 0
           LIMIT 1`,
          [dateParam, slotId, staffId, branchId],
        );
        if (staffRows.length === 0) {
          redirect(`/booking/staff?branch=${branchId}&date=${dateParam}&slot=${slotId}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`);
        }
        staffName = staffRows[0].full_name;
        staffCode = staffRows[0].staff_code;
        staffIsBooked = staffRows[0].is_booked;

        if (staffIsBooked === 1 && lineIdParam) {
          const ownRows = await query<{ booking_code: string }[]>(
            `SELECT booking_code
             FROM bookings
             WHERE branch_id = ?
               AND booking_date = ?
               AND time_slot_id = ?
               AND staff_id = ?
               AND line_id = ?
               AND is_deleted = 0
             LIMIT 1`,
            [branchId, dateParam, slotId, staffId, lineIdParam],
          );
          if (ownRows.length > 0) {
            ownBookingCode = ownRows[0].booking_code;
          }
        }
      }
    } catch {
      hasDbError = true;
    }
  }

  if (ownBookingCode) {
    redirect(
      `/booking/success?booking_code=${encodeURIComponent(ownBookingCode)}&branch=${branchId}`,
    );
  }

  const thaiDateLabel = toThaiDateLabel(dateParam);
  const bookingReady =
    !hasDbError &&
    branchName !== "-" &&
    slotLabel !== "-" &&
    staffName !== "-" &&
    thaiDateLabel !== "-";
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
    Number.isFinite(branchId) && branchId > 0
      ? `/booking/confirm?branch=${branchId}&date=${dateParam}&slot=${slotParam}${staffParam ? `&staff=${staffParam}` : ""}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`
      : null,
  ];

  return (
    <>
      <div className="sticky top-0 z-30 flex-shrink-0 bg-white border-b border-slate-100 shadow-sm">
        <BookingTopBar
          title="ยืนยันการจอง"
          backHref={`/booking/staff?branch=${branchId}&date=${dateParam}&slot=${slotId}${lineIdParam ? `&line_id=${encodeURIComponent(lineIdParam)}` : ""}`}
        />
        <BookingSteps currentStep={5} stepLinks={stepLinks} />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl">
          {hasDbError ? (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 font-medium">
              โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
            </div>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
              <h3 className="text-sm font-semibold text-slate-700">ข้อมูลการจอง</h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <MapPin className="h-3.5 w-3.5 text-sky-600" />
                    {branchName}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Calendar className="h-3.5 w-3.5 text-sky-600" />
                    {thaiDateLabel}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Clock className="h-3.5 w-3.5 text-sky-600" />
                    {slotLabel}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <User className="h-3.5 w-3.5 text-sky-600" />
                    {staffName} <span className="text-xs font-normal text-slate-500">({staffCode})</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-8">
            <ConfirmBookingForm
              bookingReady={bookingReady}
              branch={branchParam}
              date={dateParam}
              slot={slotParam}
              staff={staffParam}
              lineId={lineIdParam}
              isBooked={staffIsBooked === 1}
            />
          </div>
        </div>
      </div>
    </>
  );
}
