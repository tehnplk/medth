import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import AdminSidebar from "@/components/admin-sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-2xl">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <AdminSidebar
            currentUserName={session?.user?.name ?? null}
            currentRole={(session?.user as { role?: string })?.role ?? null}
          />
          <section>{children}</section>
        </div>
      </div>
    </main>
  );
}
