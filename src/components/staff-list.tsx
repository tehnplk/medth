"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, User, X } from "lucide-react";
import { resolveImageSrc } from "@/lib/image-path";

type StaffRow = {
  id: number;
  staff_code: string;
  full_name: string;
  phone: string | null;
  gender: "male" | "female" | "other";
  photo_path: string | null;
  skill_note: string | null;
  status: "active" | "inactive";
  is_booked: number;
  is_on_leave: number;
};

type StaffListProps = {
  initialStaff: StaffRow[];
  branchId: number;
  dateParam: string;
  slotId: number;
  lineId: string;
};

export default function StaffList({ initialStaff, branchId, dateParam, slotId, lineId }: StaffListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStaff = useMemo(() => {
    let list = initialStaff;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.staff_code.toLowerCase().includes(q)
      );
    }
    
    // Sort logic (same as server side but reactive)
    return [
      ...list.filter((s) => s.is_on_leave === 0 && s.is_booked === 0),
      ...list.filter((s) => s.is_on_leave === 1),
      ...list.filter((s) => s.is_on_leave === 0 && s.is_booked === 1),
    ];
  }, [initialStaff, searchQuery]);

  return (
    <>
      <div className="mb-8 relative group">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
          <Search className={`h-5 w-5 transition-colors duration-300 ${searchQuery ? "text-sky-600" : "text-slate-400"}`} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อพนักงาน..."
          autoComplete="off"
          className="block w-full rounded-[1.5rem] border-2 border-slate-200 bg-white py-4 pl-14 pr-12 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-200">
            {searchQuery ? "ไม่พบพนักงานที่ตรงกับการค้นหา" : "ยังไม่มีพนักงานพร้อมให้บริการในขณะนี้"}
          </div>
        ) : null}

        {filteredStaff.map((staff) => {
          const isBooked = staff.is_booked === 1;
          const isOnLeave = staff.is_on_leave === 1;
          const isDisabled = isBooked || isOnLeave;

          const card = (
            <div className={`group relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-all duration-300 ${
              isDisabled 
                ? "border-slate-100 bg-slate-50/50 opacity-60" 
                : "border-slate-200 bg-white hover:border-sky-300 hover:shadow-xl hover:shadow-sky-100"
            }`}>
              {isOnLeave && (
                <div className="absolute right-4 top-4 z-10 rotate-12 rounded-lg border-2 border-red-500 px-3 py-1 text-xs font-black uppercase text-red-500">
                  ลาหยุด
                </div>
              )}
              
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div
                    className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/70 shadow-[0_14px_24px_-16px_rgba(37,99,235,0.65)] ${
                      staff.gender === "male"
                        ? "bg-sky-100 text-sky-500"
                        : staff.gender === "female"
                          ? "bg-pink-100 text-pink-500"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {resolveImageSrc(staff.photo_path) ? (
                      <Image
                        src={resolveImageSrc(staff.photo_path)}
                        alt={staff.full_name}
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="h-7 w-7" />
                    )}
                  </div>
                  {!isDisabled && (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                  )}
                </div>
                
                <div className="min-w-0 flex-1">
                  <h4 className={`truncate text-lg font-black ${isDisabled ? "text-slate-500" : "text-slate-900 group-hover:text-sky-700"}`}>
                    {staff.full_name}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    รหัส: {staff.staff_code}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                
                <div className="flex items-center justify-end border-t border-slate-50 pt-4">
                  {isBooked && !isOnLeave ? (
                    <span className="text-[11px] font-black text-amber-600">ติดจอง</span>
                  ) : isDisabled ? null : (
                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-600">เลือกท่านนี้</span>
                  )}
                </div>
              </div>
            </div>
          );

          return isDisabled ? (
            <div key={staff.id} className="cursor-not-allowed">
              {card}
            </div>
          ) : (
            <Link
              key={staff.id}
              href={`/booking/confirm?branch=${branchId}&date=${dateParam}&slot=${slotId}&staff=${staff.id}${lineId ? `&line_id=${encodeURIComponent(lineId)}` : ""}`}
              className="block transition-transform active:scale-[0.98]"
            >
              {card}
            </Link>
          );
        })}
      </section>
    </>
  );
}
