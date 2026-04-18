import SocketLiveRefresh from "@/components/socket-live-refresh";

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-slate-50/50">
      <div className="mx-auto flex min-h-screen w-full flex-col bg-white shadow-2xl shadow-slate-200/50 ring-1 ring-slate-100 md:max-w-[700px] lg:max-w-[850px]">
        <SocketLiveRefresh />
        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
