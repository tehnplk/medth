"use client";

import { useEffect } from "react";

export default function SuccessHistoryLock() {
  useEffect(() => {
    const currentUrl = window.location.href;

    window.history.pushState({ bookingSuccess: true }, "", currentUrl);

    const handlePopState = () => {
      window.history.pushState({ bookingSuccess: true }, "", currentUrl);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return null;
}
