"use client";

import { useEffect, useState } from "react";

type Props = {
  lat: number | null;
  lng: number | null;
};

type State =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "no-coords" }
  | { kind: "ok"; km: number };

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function BranchDistance({ lat, lng }: Props) {
  const [state, setState] = useState<State>(() =>
    lat === null || lng === null ? { kind: "no-coords" } : { kind: "loading" },
  );

  useEffect(() => {
    if (lat === null || lng === null) {
      setState({ kind: "no-coords" });
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ kind: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = haversineKm(
          pos.coords.latitude,
          pos.coords.longitude,
          lat,
          lng,
        );
        setState({ kind: "ok", km });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState({ kind: "denied" });
        } else {
          setState({ kind: "unavailable" });
        }
      },
      { maximumAge: 60_000, timeout: 10_000 },
    );
  }, [lat, lng]);

  let text: string;
  switch (state.kind) {
    case "loading":
      text = "กำลังคำนวณระยะทาง…";
      break;
    case "denied":
      text = "ไม่อนุญาตให้ระบุตำแหน่ง";
      break;
    case "unavailable":
      text = "ไม่สามารถระบุตำแหน่งได้";
      break;
    case "no-coords":
      text = "ไม่มีพิกัดสาขา";
      break;
    case "ok":
      text = `${state.km.toFixed(state.km < 10 ? 2 : 1)} กม.`;
      break;
  }

  return <>ระยะทางจากคุณ: {text}</>;
}
