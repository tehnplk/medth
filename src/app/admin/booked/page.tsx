export const dynamic = "force-dynamic";

import Link from "next/link";
import { Check, CheckCheck, Clock, Plus } from "lucide-react";
import { query } from "@/lib/db";
import BookedDateInput from "@/components/booked-date-input";
import BookingSlotButton from "@/components/booking-slot-button";
import EmptySlotButton from "@/components/empty-slot-button";
import SocketLiveRefresh from "@/components/socket-live-refresh";

type SearchParams = Promise<{
  branch?: string | string[] | undefined;
  date?: string | string[] | undefined;
}>;

type BranchRow = { id: number; name: string };
type TimeSlotRow = { id: number; begin_time: string; end_time: string };
type StaffRow = { id: number; full_name: string; staff_code: string };
type BookingStatus = "pending" | "confirmed" | "completed";
type BookingRow = {
  id: number;
  booking_code: string;
  staff_id: number;
  time_slot_id: number;
  customer_name: string;
  customer_phone: string;
  booking_status: BookingStatus;
};
type LeaveRow = { staff_id: number };

function getQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatTime(raw: string): string {
  const [hour = "00", minute = "00"] = raw.split(":");
  return `${hour}.${minute}`;
}

function bangkokTodayIso(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export default async function BookedPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const branchParam = getQueryValue(searchParams.branch);
  const dateParamRaw = getQueryValue(searchParams.date);
  const dateParam = /^\d{4}-\d{2}-\d{2}$/.test(dateParamRaw) ? dateParamRaw : bangkokTodayIso();

  const branches = await query<BranchRow[]>(
    "SELECT id, name FROM branches WHERE is_active = 1 AND is_deleted = 0 ORDER BY id ASC",
  );

  const parsedBranch = Number(branchParam);
  const branchId =
    Number.isFinite(parsedBranch) && parsedBranch > 0
      ? parsedBranch
      : branches[0]?.id ?? 0;

  let timeSlots: TimeSlotRow[] = [];
  let staffList: StaffRow[] = [];
  let bookings: BookingRow[] = [];
  let leaves: LeaveRow[] = [];

  if (branchId > 0) {
    [timeSlots, staffList, bookings, leaves] = await Promise.all([
      query<TimeSlotRow[]>(
        "SELECT id, begin_time, end_time FROM time_slots WHERE branch_id = ? ORDER BY begin_time ASC",
        [branchId],
      ),
      query<StaffRow[]>(
        `SELECT id, full_name, staff_code
           FROM staff
           WHERE branch_id = ? AND status = 'active' AND is_deleted = 0
           ORDER BY staff_code ASC`,
        [branchId],
      ),
      query<BookingRow[]>(
        `SELECT id, booking_code, staff_id, time_slot_id, customer_name, customer_phone, booking_status
           FROM bookings
           WHERE branch_id = ?
             AND booking_date = ?
             AND is_deleted = 0`,
        [branchId, dateParam],
      ),
      query<LeaveRow[]>(
        `SELECT sl.staff_id
           FROM staff_leaves sl
           JOIN staff s ON s.id = sl.staff_id
           WHERE s.branch_id = ? AND sl.leave_date = ?
             AND s.is_deleted = 0`,
        [branchId, dateParam],
      ),
    ]);
  }

  const bookingMap = new Map<
    string,
    {
      id: number;
      code: string;
      name: string;
      phone: string;
      status: BookingStatus;
    }
  >();
  for (const b of bookings) {
    bookingMap.set(`${b.staff_id}-${b.time_slot_id}`, {
      id: b.id,
      code: b.booking_code,
      name: b.customer_name,
      phone: b.customer_phone,
      status: b.booking_status,
    });
  }

  const statusClass: Record<BookingStatus, string> = {
    pending: "bg-slate-100 text-slate-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-green-300 text-green-900",
  };
  const phoneClass: Record<BookingStatus, string> = {
    pending: "text-slate-500",
    confirmed: "text-green-700/80",
    completed: "text-green-900/80",
  };
  const leaveSet = new Set(leaves.map((l) => l.staff_id));

  return (
    <div className="space-y-4">
      <SocketLiveRefresh />
      <section className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
              Booked
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">รายการจอง</h1>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => {
              const isActive = b.id === branchId;
              return (
                <Link
                  key={b.id}
                  href={`/admin/booked?branch=${b.id}&date=${dateParam}`}
                  className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    isActive
                      ? "border-sky-500 bg-sky-600 text-white"
                      : "border-sky-200 bg-white text-sky-800 hover:border-sky-300 hover:bg-sky-50"
                  }`}
                >
                  {b.name}
                </Link>
              );
            })}
          </div>
          <BookedDateInput branchId={branchId} defaultValue={dateParam} />
        </div>
      </section>

      <section className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
        {timeSlots.length === 0 || staffList.length === 0 ? (
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            ยังไม่มีข้อมูลพนักงานหรือช่วงเวลาของสาขานี้
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
              <colgroup>
                <col className="w-48" />
                {timeSlots.map((t) => (
                  <col key={t.id} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-sky-200 bg-sky-50 px-3 py-2 text-left font-semibold text-sky-900">
                    พนักงาน
                  </th>
                  {timeSlots.map((t) => (
                    <th
                      key={t.id}
                      className="border-b border-sky-200 bg-sky-50 px-3 py-2 text-center font-semibold text-sky-900 whitespace-nowrap"
                    >
                      {formatTime(t.begin_time)}-{formatTime(t.end_time)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => {
                  const onLeave = leaveSet.has(s.id);
                  return (
                    <tr key={s.id} className="odd:bg-white even:bg-sky-50/40">
                      <td className="sticky left-0 border-b border-sky-100 bg-inherit px-3 py-2 font-medium text-slate-900">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500">{s.staff_code}</span>
                          <span>{s.full_name}</span>
                        </div>
                      </td>
                      {timeSlots.map((t) => {
                        const booker = bookingMap.get(`${s.id}-${t.id}`);
                        const timeLabel = `${formatTime(t.begin_time)}-${formatTime(t.end_time)}`;
                        return (
                          <td
                            key={t.id}
                            className="border-b border-sky-100 p-2 align-middle"
                          >
                            {booker ? (
                              <BookingSlotButton
                                bookingId={booker.id}
                                bookingCode={booker.code}
                                name={booker.name}
                                phone={booker.phone}
                                status={booker.status}
                                staffName={s.full_name}
                                timeLabel={timeLabel}
                                dateLabel={dateParam}
                              >
                                <div
                                  className={`relative flex h-14 flex-col items-stretch justify-center rounded-md px-2 ${statusClass[booker.status]}`}
                                >
                                  {booker.status === "confirmed" ? (
                                    <Check className="absolute right-1.5 top-1 h-3.5 w-3.5 text-green-600" />
                                  ) : booker.status === "completed" ? (
                                    <CheckCheck className="absolute right-1.5 top-1 h-3.5 w-3.5 text-green-800" />
                                  ) : null}
                                  <span className="w-full truncate text-left text-xs font-semibold leading-tight">
                                    {booker.name}
                                  </span>
                                  <span
                                    className={`w-full truncate text-right text-[11px] leading-tight ${phoneClass[booker.status]}`}
                                  >
                                    {booker.phone}
                                  </span>
                                  <span
                                    className={`absolute bottom-0.5 left-1.5 inline-flex items-center gap-0.5 text-[8px] leading-none opacity-50 ${phoneClass[booker.status]}`}
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    {timeLabel}
                                  </span>
                                </div>
                              </BookingSlotButton>
                            ) : onLeave ? (
                              <div className="flex h-14 items-center justify-center rounded-2xl bg-red-100 text-xs font-semibold text-red-600">
                                ลา
                              </div>
                            ) : (
                              <EmptySlotButton
                                branchId={branchId}
                                staffId={s.id}
                                timeSlotId={t.id}
                                staffName={s.full_name}
                                timeLabel={timeLabel}
                                dateLabel={dateParam}
                              >
                                <div className="relative flex h-14 items-center justify-center rounded-md border border-dashed border-sky-100 text-slate-300">
                                  <Plus className="h-4 w-4" />
                                  <span className="absolute bottom-0.5 left-1.5 inline-flex items-center gap-0.5 text-[8px] leading-none text-slate-400 opacity-60">
                                    <Clock className="h-2.5 w-2.5" />
                                    {timeLabel}
                                  </span>
                                </div>
                              </EmptySlotButton>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
