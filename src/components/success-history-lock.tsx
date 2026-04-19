"use client";

import { useEffect } from "react";

export default function SuccessHistoryLock() {
  useEffect(() => {
    window.history.pushState({ bookingSuccess: true }, "", window.location.href);

    const handlePopState = () => {
      window.location.replace("/booking");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return null;
}
