"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

export default function SocketLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Connect to the socket server on the current origin
    const socket = io();

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
