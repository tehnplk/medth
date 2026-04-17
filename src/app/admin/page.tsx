export const dynamic = "force-dynamic";

import Link from "next/link";
import { CalendarClock, ChevronRight, MapPinned, UsersRound } from "lucide-react";
import { query } from "@/lib/db";

type CountRow = {
  total: number;
};

type BranchStatusRow = {
  name: string;
  is_active: number;
};

const adminLinks = [
  {
    href: "/admin/branches",
    label: "จัดการสาขา",
    description: "ดูข้อมูลสาขา รายละเอียด และสถานะเปิดใช้งาน",
    icon: MapPinned,
  },
  {
    href: "/admin/staff",
    label: "จัดการพนักงาน",
    description: "ตรวจสอบรายชื่อพนักงานและสถานะการทำงาน",
    icon: UsersRound,
  },
  {
    href: "/admin/time-slots",
    label: "จัดการเวลาจอง",
    description: "ดูช่วงเวลาที่เปิดรับจองของแต่ละสาขา",
    icon: CalendarClock,
  },
];

export default async function AdminPage() {
  const [branchRows, staffRows, timeSlotRows, openBranchRows, branchStatusRows] =
    await Promise.all([
      query<CountRow[]>("SELECT COUNT(*) AS total FROM branches"),
      query<CountRow[]>("SELECT COUNT(*) AS total FROM staff"),
      query<CountRow[]>("SELECT COUNT(*) AS total FROM time_slots"),
      query<CountRow[]>("SELECT COUNT(*) AS total FROM branches WHERE is_active = 1"),
      query<BranchStatusRow[]>(
        "SELECT name, is_active FROM branches ORDER BY is_active DESC, id ASC LIMIT 5",
      ),
    ]);

  const stats = [
    { label: "สาขาทั้งหมด", value: branchRows[0]?.total ?? 0 },
    { label: "พนักงานทั้งหมด", value: staffRows[0]?.total ?? 0 },
    { label: "เวลาจองทั้งหมด", value: timeSlotRows[0]?.total ?? 0 },
    { label: "สาขาที่เปิดใช้งาน", value: openBranchRows[0]?.total ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">ภาพรวมการจัดการระบบจอง</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          หน้านี้เป็นจุดเริ่มต้นสำหรับดูข้อมูลภาพรวมและเข้าไปจัดการแต่ละส่วนของระบบ
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-sky-100 bg-[linear-gradient(160deg,_rgba(255,255,255,1)_0%,_rgba(240,249,255,0.9)_100%)] p-4"
            >
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
          <p className="text-lg font-semibold text-slate-950">เมนูจัดการ</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-sky-100 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 transition group-hover:bg-sky-600 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
          <p className="text-lg font-semibold text-slate-950">สถานะสาขา</p>
          <div className="mt-4 space-y-3">
            {branchStatusRows.map((branch) => (
              <div
                key={branch.name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-900">{branch.name}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    branch.is_active === 1
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {branch.is_active === 1 ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
