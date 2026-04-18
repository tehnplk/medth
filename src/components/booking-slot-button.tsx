"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Check, CheckCheck, Circle, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import AdminModal from "./admin-modal";
import { formatThaiDateShort } from "@/lib/thai-date";

type Status = "pending" | "confirmed" | "completed";

type Props = {
  bookingId: number;
  bookingCode: string;
  name: string;
  phone: string;
  status: Status;
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

export default function BookingSlotButton({
  bookingId,
  bookingCode,
  name,
  phone,
  status,
  staffName,
  timeLabel,
  dateLabel,
  children,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<Status>(status);

  async function updateStatus(next: Status) {
    if (next === current || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_status: next }),
      });
      if (!res.ok) throw new Error("update failed");
      setCurrent(next);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteBooking() {
    if (saving) return;

    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: `ลบการจอง ${bookingCode} ใช่หรือไม่`,
      input: "textarea",
      inputLabel: "เหตุผลการลบ",
      inputPlaceholder: "กรอกเหตุผลการลบ",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => {
        if (!value || !String(value).trim()) return "กรุณาระบุเหตุผลการลบ";
        return null;
      },
    });
    if (!result.isConfirmed) return;

    const deleteNote = String(result.value ?? "").trim();
    if (!deleteNote) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delete_note: deleteNote }),
      });
      if (!res.ok) throw new Error("delete failed");
      setOpen(false);
      router.refresh();
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
        title="รายละเอียดการจอง"
        description={`${staffName} | ${timeLabel} | ${formatThaiDateShort(dateLabel)}`}
      >
        <div className="space-y-4">
          <div className="divide-y divide-sky-100 rounded-2xl border border-sky-100 bg-sky-50/60">
            <div className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-20 shrink-0 text-sky-700">รหัสจอง</span>
              <span className="font-semibold text-slate-900">{bookingCode}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-20 shrink-0 text-sky-700">ผู้จอง</span>
              <span className="font-medium text-slate-900">{name}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-20 shrink-0 text-sky-700">เบอร์โทร</span>
              <span className="font-medium text-slate-900">{phone}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">สถานะ</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const active = opt.key === current;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={saving}
                    onClick={() => updateStatus(opt.key)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-xs font-semibold transition disabled:opacity-60 ${
                      active
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

          <div className="flex justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={deleteBooking}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              ลบการจอง
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-sky-200 bg-white px-5 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      </AdminModal>
    </>
  );
}
