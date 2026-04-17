import type { ReactNode } from "react";
import AdminSidebar from "@/components/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-2xl">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <AdminSidebar />
          <section>{children}</section>
        </div>
      </div>
    </main>
  );
}
