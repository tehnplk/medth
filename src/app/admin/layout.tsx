import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminSidebar from "@/components/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-white/80 px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm backdrop-blur"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับหน้าจอง
          </Link>
          <p className="text-sm font-semibold text-sky-800">แผงจัดการระบบ</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <AdminSidebar />
          <section>{children}</section>
        </div>
      </div>
    </main>
  );
}
