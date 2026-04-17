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
      className="mt-4 rounded-2xl border border-sky-200 bg-white/90 p-4 shadow-[0_10px_24px_-18px_rgba(37,99,235,0.22)]"
    >
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="staff" value={staff} />

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-sky-900">
            ชื่อผู้จอง
          </span>
          <input
            type="text"
            name="first_name"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="ชื่อ"
            className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-sky-900">
            นามสกุล
          </span>
          <input
            type="text"
            name="last_name"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="นามสกุล"
            className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-sky-900">
            เบอร์โทร
          </span>
          <input
            type="tel"
            name="phone"
            required
            value={phone}
            onChange={(event) => setPhone(formatPhoneMask(event.target.value))}
            inputMode="numeric"
            maxLength={12}
            pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
            placeholder="000-000-0000"
            className="w-full rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="mt-2 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          {isSubmitting ? "กำลังยืนยัน..." : "ยืนยันการจอง"}
        </button>
      </div>
    </form>
  );
}
