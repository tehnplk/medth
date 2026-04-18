"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Check, CheckCheck, Circle } from "lucide-react";
import Swal from "sweetalert2";
import AdminModal from "./admin-modal";
import { formatThaiDateShort } from "@/lib/thai-date";

type Status = "pending" | "confirmed" | "completed";

type Props = {
  branchId: number;
  staffId: number;
  timeSlotId: number;
  staffName: string;
  timeLabel: string;
  dateLabel: string;
  children: ReactNode;
};

const statusOptions: Array<{
  key: Status;
  label: string;
  icon: typeof Check;
  iconClass: string;
}> = [
  { key: "pending", label: "รอยืนยัน", icon: Circle, iconClass: "text-slate-500" },
  { key: "confirmed", label: "ยืนยันแล้ว", icon: Check, iconClass: "text-green-600" },
  { key: "completed", label: "เสร็จสิ้น", icon: CheckCheck, iconClass: "text-green-600" },
];

export default function EmptySlotButton({
  branchId,
  staffId,
  timeSlotId,
  staffName,
  timeLabel,
  dateLabel,
  children,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>("pending");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const phoneDigits = customerPhone.replaceAll("-", "");

  function formatPhoneMask(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 10);

    if (digits.length <= 3) return p1;
    if (digits.length <= 6) return `${p1}-${p2}`;
    return `${p1}-${p2}-${p3}`;
  }

  async function createBooking() {
    if (!customerName || phoneDigits.length !== 10 || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: branchId,
          staff_id: staffId,
          time_slot_id: timeSlotId,
          booking_date: dateLabel,
          customer_name: customerName,
          customer_phone: customerPhone,
          booking_status: status,
        }),
      });

      const payload = (await res.json().catch(() => null)) as
        | { error?: string; booking_code?: string }
        | null;

      if (!res.ok) {
        const slotMessage =
          res.status === 409 && payload?.booking_code
            ? `ช่วงเวลานี้ถูกจองแล้ว รหัสการจอง ${payload.booking_code}`
            : payload?.error || "ไม่สามารถเพิ่มการจองได้";
        throw new Error(slotMessage);
      }

      setOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setStatus("pending");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "ไม่สามารถเพิ่มการจองได้";
      await Swal.fire({
        icon: "error",
        title: "เพิ่มการจองไม่สำเร็จ",
        text: message,
        confirmButtonText: "ตกลง",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-pointer rounded-md transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        {children}
      </button>

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title="เพิ่มการจองใหม่"
        description={`${staffName} | ${timeLabel} | ${formatThaiDateShort(dateLabel)}`}
      >
        <div className="space-y-4">
          <div className="divide-y divide-sky-100 rounded-2xl border border-sky-100 bg-sky-50/60">
            <div className="flex flex-col gap-2 px-4 py-3">
              <label className="text-sm font-semibold text-sky-700">
                ชื่อผู้จอง
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={saving}
                placeholder="กรอกชื่อผู้จอง"
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-300 disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-2 px-4 py-3">
              <label className="text-sm font-semibold text-sky-700">
                เบอร์โทร
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(formatPhoneMask(e.target.value))}
                disabled={saving}
                inputMode="numeric"
                maxLength={12}
                pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                placeholder="000-000-0000"
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-300 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">สถานะ</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = opt.key === status;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={saving}
                    onClick={() => setStatus(opt.key)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-semibold transition disabled:opacity-60 ${
                      isActive
                        ? "border-sky-500 bg-sky-50 text-sky-800 shadow-[0_8px_20px_-14px_rgba(59,130,246,0.45)]"
                        : "border-sky-200 bg-white text-slate-700 hover:border-sky-300"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${opt.iconClass}`} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="rounded-full border border-sky-200 bg-white px-5 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-50 disabled:opacity-60"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={createBooking}
              disabled={saving || !customerName || phoneDigits.length !== 10}
              className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              เพิ่มการจอง
            </button>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
