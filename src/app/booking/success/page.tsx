import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { query } from "@/lib/db";
import SuccessHistoryLock from "@/components/success-history-lock";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-6 sm:px-6">
      <SuccessHistoryLock />
      <div className="mx-auto w-full max-w-md rounded-3xl border border-sky-200/80 bg-white/95 p-5 shadow-[0_12px_32px_-18px_rgba(37,99,235,0.24)]">
        <p className="text-sm font-semibold text-green-700">จองสำเร็จ</p>

        {!receipt ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">ไม่พบข้อมูลใบจอง</p>
          </div>
        ) : (
          <section className="mt-3 rounded-2xl border border-sky-200 bg-white p-4">
            <p className="text-sm font-semibold text-sky-900">ใบจอง</p>

            <div className="mt-2 divide-y divide-sky-100 rounded-xl border border-sky-100 bg-sky-50/60">
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-sky-700">รหัสจอง</span>
                <span className="min-w-0 truncate font-semibold text-sky-900">
                  {receipt.booking_code}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-sky-700">ผู้จอง</span>
                <span className="min-w-0 truncate font-medium text-sky-900">
                  {receipt.customer_name}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-sky-700">เบอร์โทร</span>
                <span className="min-w-0 truncate font-medium text-sky-900">
                  {receipt.customer_phone}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-sky-700">สาขา</span>
                <span className="min-w-0 truncate font-medium text-sky-900">
                  {receipt.branch_name}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-sky-700">วันที่</span>
                <span className="min-w-0 truncate font-medium text-sky-900">
                  {toThaiDateLabel(receipt.booking_date)}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-sky-700">เวลา</span>
                <span className="min-w-0 truncate font-medium text-sky-900">
                  {formatTime(receipt.begin_time)} - {formatTime(receipt.end_time)}น.
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-sky-700">พนักงาน</span>
                <span className="min-w-0 truncate font-medium text-sky-900">
                  {receipt.staff_name}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <Image
                src={qrUrl}
                alt="QR Code ใบจอง"
                width={220}
                height={220}
                unoptimized
                className="rounded-xl border border-sky-200 bg-white p-2"
              />
            </div>
          </section>
        )}

        <Link
          href="/booking"
          className="mt-4 inline-flex w-full justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </main>
  );
}
