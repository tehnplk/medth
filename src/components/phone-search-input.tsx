"use client";

import { useState } from "react";
import { Phone } from "lucide-react";

function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 10);

  if (digits.length <= 3) return p1;
  if (digits.length <= 6) return `${p1}-${p2}`;
  return `${p1}-${p2}-${p3}`;
}

type Props = {
  defaultValue?: string;
};

export default function PhoneSearchInput({ defaultValue = "" }: Props) {
  const [value, setValue] = useState(formatPhoneMask(defaultValue));

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <Phone className="h-5 w-5 text-slate-300" />
      </div>
      <input
        type="tel"
        name="phone"
        inputMode="numeric"
        maxLength={12}
        pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
        placeholder="08X-XXX-XXXX"
        value={value}
        onChange={(event) => setValue(formatPhoneMask(event.target.value))}
        autoComplete="off"
        className="block w-full rounded-2xl border-2 border-slate-300 bg-white py-4 pl-12 pr-4 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100 transition-all shadow-sm"
      />
    </div>
  );
}
