"use client";

import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

type Props = {
  branchId: number;
  defaultValue: string;
};

export default function BookedDateInput({ branchId, defaultValue }: Props) {
  const router = useRouter();

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sm font-semibold text-sky-800 shadow-[0_8px_20px_-18px_rgba(37,99,235,0.35)]">
      <Calendar className="h-4 w-4 text-sky-600" />
      <input
        type="date"
        defaultValue={defaultValue}
        onChange={(event) => {
          const next = event.target.value;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
          router.push(`/admin/booked?branch=${branchId}&date=${next}`);
        }}
        className="bg-transparent text-sm font-semibold text-sky-900 outline-none"
      />
    </label>
  );
}
