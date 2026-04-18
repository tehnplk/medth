import SocketLiveRefresh from "@/components/socket-live-refresh";

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex h-dvh max-w-sm flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)]">
      <SocketLiveRefresh />
      {children}
    </div>
  );
}
