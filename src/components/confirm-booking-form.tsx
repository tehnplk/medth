"use client";

import { useState } from "react";

type ConfirmBookingFormProps = {
  bookingReady: boolean;
  branch: string;
  date: string;
  slot: string;
  staff: string;
};

export default function ConfirmBookingForm({
  bookingReady,
  branch,
  date,
  slot,
  staff,
}: ConfirmBookingFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phoneDigits = phone.replaceAll("-", "");

  function formatPhoneMask(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 10);

    if (digits.length <= 3) return p1;
    if (digits.length <= 6) return `${p1}-${p2}`;
    return `${p1}-${p2}-${p3}`;
  }

  const canSubmit =
    bookingReady &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phoneDigits.length === 10;

  function handleSubmit() {
    setIsSubmitting(true);
  }

  return (
    <form
      action="/booking/confirm/submit"
      method="POST"
      onSubmit={handleSubmit}
      className="mt-6 space-y-6"
    >
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="staff" value={staff} />

      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 focus-within:border-sky-300 focus-within:shadow-xl focus-within:shadow-sky-100">
        <h3 className="mb-6 text-xl font-black text-slate-900">ผู้จอง</h3>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">ชื่อ</span>
            <input
              type="text"
              name="first_name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="กรอกชื่อ"
              autoComplete="off"
              className="w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 text-base font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100 shadow-sm"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">นามสกุล</span>
            <input
              type="text"
              name="last_name"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="กรอกนามสกุล"
              autoComplete="off"
              className="w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 text-base font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100 shadow-sm"
            />
          </label>
        </div>

        <label className="mt-6 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">เบอร์โทรศัพท์</span>
          <div className="relative">
            <input
              type="tel"
              name="phone"
              required
              value={phone}
              onChange={(event) => setPhone(formatPhoneMask(event.target.value))}
              inputMode="numeric"
              maxLength={12}
              pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
              placeholder="08X-XXX-XXXX"
              autoComplete="off"
              className="w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 text-base font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100 shadow-sm"
            />
          </div>
        </label>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-sky-600 px-6 py-5 text-lg font-black text-white shadow-xl shadow-sky-200 transition-all hover:bg-sky-700 hover:-translate-y-1 active:translate-y-0 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0"
        >
          <span className="relative z-10">
            {isSubmitting ? "กำลังจอง..." : "ยืนยันการจอง"}
          </span>
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </button>
      </div>
    </form>
  );
}
