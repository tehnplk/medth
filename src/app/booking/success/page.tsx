import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { query } from "@/lib/db";
import { Calendar, CheckCircle2, Clock, MapPin, User } from "lucide-react";
import SuccessHistoryLock from "@/components/success-history-lock";
import BookingTopBar from "@/components/booking-top-bar";

type SearchParams = Promise<{
  booking_code?: string | string[] | undefined;
  branch?: string | string[] | undefined;
}>;

type ReceiptRow = {
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string | Date;
  branch_name: string;
  staff_name: string;
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

function toIsoDateString(value: string | Date): string {
  if (typeof value === "string") return value;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toThaiDateLabel(value: string | Date): string {
  const isoDate = toIsoDateString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "-";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = thaiWeekdays[date.getUTCDay()];
  const label = `${d} ${thaiMonthsShort[m - 1]} ${y + 543}`;
  return `${weekday} ที่ ${label}`;
}

function formatTime(raw: string): string {
  const [hour = "00", minute = "00"] = raw.split(":");
  return `${hour}.${minute}`;
}

export default async function SuccessPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const bookingCode = getQueryValue(searchParams.booking_code);
  const branchId = Number(getQueryValue(searchParams.branch));

  let receipt: ReceiptRow | null = null;

  if (bookingCode && Number.isFinite(branchId) && branchId > 0) {
    const rows = await query<ReceiptRow[]>(
      `SELECT
        b.booking_code,
        b.customer_name,
        b.customer_phone,
        b.booking_date,
        br.name AS branch_name,
        s.full_name AS staff_name,
        ts.begin_time,
        ts.end_time
      FROM bookings b
      JOIN branches br ON br.id = b.branch_id
      JOIN staff s ON s.id = b.staff_id
      JOIN time_slots ts ON ts.id = b.time_slot_id
      WHERE b.booking_code = ? AND b.branch_id = ?
        AND b.is_deleted = 0
        AND br.is_deleted = 0
        AND s.is_deleted = 0
      LIMIT 1`,
      [bookingCode, branchId],
    );

    if (rows.length > 0) receipt = rows[0];
  }

  const qrPayload = receipt
    ? `BOOKING:${receipt.booking_code}|${receipt.customer_name}|${receipt.booking_date}|${formatTime(receipt.begin_time)}-${formatTime(receipt.end_time)}`
    : "BOOKING:NOT_FOUND";
  const qrUrl = await QRCode.toDataURL(qrPayload);

  return (
    <>
      <div className="sticky top-0 z-30 flex-shrink-0 bg-white border-b border-slate-100 shadow-sm">
        <BookingTopBar title="จองสำเร็จ" />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-8 sm:px-8">
        <SuccessHistoryLock />
        
        <div className="mx-auto max-w-lg">
          {!receipt ? (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-800">
              <p className="font-bold text-lg">ไม่พบข้อมูลการจอง</p>
              <p className="mt-1 text-base opacity-80">ตรวจสอบรหัสการจองอีกครั้ง หรือติดต่อเจ้าหน้าที่</p>
            </div>
          ) : (
            <div className="relative group">
              {/* Ticket Top Decoration */}
              <div className="flex justify-center -mb-3 relative z-10">
                <div className="h-6 w-12 rounded-full bg-slate-50/50 border border-slate-200" />
              </div>
              
              <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
                <div className="bg-sky-600 px-6 py-10 text-center text-white sm:px-8">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                     <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-white sm:text-3xl">จองสำเร็จ</h2>
                </div>
                
                <div className="p-6 sm:p-8">
                  <div className="mb-8 flex flex-col items-center">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500 sm:text-sm">รหัสการจอง</p>
                    <p className="mt-1 text-lg font-bold tracking-tight text-slate-900 leading-tight break-all">{receipt.booking_code}</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                       <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sky-600">
                          <MapPin className="h-6 w-6" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">สาขา</span>
                          <span className="text-lg font-bold text-slate-900 leading-tight">{receipt.branch_name}</span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="flex items-start gap-4">
                         <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sky-600">
                            <Calendar className="h-6 w-6" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">วันที่</span>
                            <span className="text-lg font-bold text-slate-900 leading-tight">{toThaiDateLabel(receipt.booking_date)}</span>
                         </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                         <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sky-600">
                            <Clock className="h-6 w-6" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">เวลา</span>
                            <span className="text-lg font-bold text-slate-900 leading-tight">{formatTime(receipt.begin_time)} - {formatTime(receipt.end_time)} น.</span>
                         </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                       <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sky-600">
                          <User className="h-6 w-6" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">พนักงาน</span>
                          <span className="text-lg font-bold text-slate-900 leading-tight">{receipt.staff_name}</span>
                       </div>
                    </div>
                  </div>
                  
                  {/* QR Code Section */}
                  <div className="mt-12 flex flex-col items-center justify-center border-t-2 border-dashed border-slate-100 pt-10">
                    <div className="relative group/qr">
                      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-sky-500/10 to-teal-500/10 opacity-0 group-hover/qr:opacity-100 transition-opacity" />
                      <Image
                        src={qrUrl}
                        alt="QR Code"
                        width={220}
                        height={220}
                        unoptimized
                        className="relative rounded-3xl border-8 border-white bg-white shadow-2xl transition-transform group-hover/qr:scale-105"
                      />
                    </div>
                    <p className="mt-8 text-sm font-bold uppercase tracking-widest text-slate-500">แสดง QR Code เมื่อถึงโครงการ</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          <div className="mt-10 flex flex-col gap-4">
            <Link
              href="/booking"
              className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-5 text-base font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
