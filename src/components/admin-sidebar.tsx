"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarClock,
  CalendarCheck,
  CalendarX,
  ChevronRight,
  LogOut,
  MapPinned,
  ShieldUser,
  UsersRound,
} from "lucide-react";

const menuItems = [
  {
    href: "/admin/booked",
    label: "รายการจอง",
    description: "ตารางจองต่อสาขาและวันที่",
    icon: CalendarCheck,
  },
  {
    href: "/admin/branches",
    label: "จัดการสาขา",
    description: "ข้อมูลสาขาและสถานะ",
    icon: MapPinned,
  },
  {
    href: "/admin/date-off",
    label: "จัดการวันหยุด",
    description: "วันหยุดแต่ละสาขา",
    icon: CalendarX,
  },
  {
    href: "/admin/staff",
    label: "จัดการพนักงาน",
    description: "รายชื่อพนักงานทั้งหมด",
    icon: UsersRound,
  },
  {
    href: "/admin/time-slots",
    label: "จัดการเวลาจอง",
    description: "ช่วงเวลาเปิดรับจอง",
    icon: CalendarClock,
  },
  {
    href: "/admin/users",
    label: "จัดการผู้ใช้งาน",
    description: "จัดการผู้ใช้งานและสิทธิ์การเข้าถึง",
    icon: ShieldUser,
  },
];

type AdminSidebarProps = {
  currentUserName?: string | null;
  currentRole?: string | null;
};

export default function AdminSidebar({ currentUserName, currentRole }: AdminSidebarProps) {
  const pathname = usePathname();

  const filteredMenuItems = menuItems.filter(
    (item) => item.href !== "/admin/users" || currentRole === "admin",
  );

  return (
    <aside className="rounded-[28px] border border-sky-200/80 bg-white/88 p-4 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
      <div className="mb-4 rounded-2xl bg-[linear-gradient(135deg,_#0284c7_0%,_#2563eb_100%)] p-4 text-white shadow-[0_16px_30px_-20px_rgba(37,99,235,0.75)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
          MedTH Admin
        </p>
        <p className="mt-2 text-lg font-semibold">จัดการข้อมูลระบบจอง</p>
      </div>

      <nav className="space-y-2">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                isActive
                  ? "border-sky-500 bg-sky-50 text-sky-900 shadow-[0_14px_24px_-18px_rgba(37,99,235,0.45)]"
                  : "border-sky-100 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  isActive ? "bg-sky-600 text-white" : "bg-sky-100 text-sky-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.label}</p>
                <p className="truncate text-xs text-slate-500">{item.description}</p>
              </div>
              <ChevronRight
                className={`h-4 w-4 shrink-0 ${isActive ? "text-sky-700" : "text-slate-400"}`}
              />
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-sky-100 pt-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-2xl border border-sky-100 bg-white px-3 py-3 text-left text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{currentUserName ?? "Admin"}</p>
            <p className="truncate text-xs text-slate-500">Logout</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>
    </aside>
  );
}
