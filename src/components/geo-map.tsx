"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  kind: "in" | "out";
  /** Precisión en metros (se dibuja como círculo). */
  accuracy: number | null;
};

const COLORS = { in: "#0f766e", out: "#e11d48" };

/** Mapa de OpenStreetMap con los puntos de fichaje (entrada en verde, salida en rojo). */
export function GeoMap({ points }: { points: MapPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    // Leaflet usa window: se carga solo en el navegador.
    import("leaflet").then((L) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const bounds = L.latLngBounds([]);
      for (const p of points) {
        const color = COLORS[p.kind];
        if (p.accuracy) L.circle([p.lat, p.lng], { radius: p.accuracy, color, weight: 1, fillOpacity: 0.08 }).addTo(map);
        L.circleMarker([p.lat, p.lng], { radius: 8, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 })
          .bindPopup(p.label)
          .addTo(map);
        bounds.extend([p.lat, p.lng]);
      }
      if (points.length) map.fitBounds(bounds.pad(0.3), { maxZoom: 16 });
      else map.setView([40.4168, -3.7038], 5);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return <div ref={ref} className="h-[28rem] w-full overflow-hidden rounded-xl border border-slate-200" />;
}
