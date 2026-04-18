import SocketLiveRefresh from "@/components/socket-live-refresh";

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SocketLiveRefresh />
      {children}
    </>
  );
}
