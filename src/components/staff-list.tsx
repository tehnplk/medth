"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, User, Calendar, Clock } from "lucide-react";
import ThumbnailPlaceholder from "@/components/thumbnail-placeholder";

type StaffRow = {
  id: number;
  staff_code: string;
  full_name: string;
  phone: string | null;
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
};

export default function StaffList({ initialStaff, branchId, dateParam, slotId }: StaffListProps) {
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
                  ลาพักงาน
                </div>
              )}
              
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <ThumbnailPlaceholder kind="staff" label={staff.full_name} />
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
              href={`/booking/confirm?branch=${branchId}&date=${dateParam}&slot=${slotId}&staff=${staff.id}`}
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
