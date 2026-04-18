"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

export default function SocketLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const socketUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:3002`
        : "";
    const socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("Connected to Bookings Live Refresh", socket.id);
    });

    socket.on("refreshBookings", () => {
      // Refresh the current route to fetch new data
      router.refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  return null; // This is a logic-only component
}
