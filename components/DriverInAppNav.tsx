/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

export type NavTarget = {
  lat: number;
  lng: number;
  label: string;
  address?: string | null;
  kind: "patient" | "hospital";
};

type Gps = {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
};

type Props = {
  target: NavTarget;
  gps: Gps | null;
  onClose: () => void;
  onOpenExternal: () => void;
  actions: Array<{ label: string; onClick: () => void; busy?: boolean }>;
  reconnectToast?: string | null;
};

function haversineKm(a: Gps, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

declare global {
  interface Window {
    L?: any;
  }
}

async function ensureLeaflet(): Promise<any> {
  if (window.L) return window.L as any;

  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  await new Promise<void>((resolve, reject) => {
    if (document.getElementById("leaflet-js")) {
      const check = () => (window.L ? resolve() : setTimeout(check, 50));
      check();
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.body.appendChild(script);
  });

  return window.L as any;
}

export function DriverInAppNav({
  target,
  gps,
  onClose,
  onOpenExternal,
  actions,
  reconnectToast,
}: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null);
  const driverMarker = useRef<any | null>(null);
  const routeLine = useRef<any | null>(null);
  const [distKm, setDistKm] = useState<number | null>(null);
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [routeErr, setRouteErr] = useState<string | null>(null);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await ensureLeaflet();
        if (cancelled || !mapEl.current || mapRef.current) return;

        const center = gps
          ? ([gps.lat, gps.lng] as [number, number])
          : ([target.lat, target.lng] as [number, number]);

        const map = L.map(mapEl.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView(center, 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);

        L.marker([target.lat, target.lng], {
          title: target.label,
        }).addTo(map);

        mapRef.current = map;
        setMapReady(true);
        setTimeout(() => map.invalidateSize(), 100);
      } catch (e) {
        setRouteErr(e instanceof Error ? e.message : "Map failed to load");
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update driver marker + route when GPS changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !gps) return;
    const L = window.L;
    if (!L) return;

    const map = mapRef.current;
    const pos: [number, number] = [gps.lat, gps.lng];

    if (!driverMarker.current) {
      driverMarker.current = L.circleMarker(pos, {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: "#1E88E5",
        fillOpacity: 1,
      }).addTo(map);
    } else {
      driverMarker.current.setLatLng(pos);
    }

    // Fit bounds lightly (don't yank camera every tick)
    const bounds = L.latLngBounds([pos, [target.lat, target.lng]]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });

    const km = haversineKm(gps, target);
    setDistKm(km);
    const speedKmh =
      gps.speed != null && gps.speed > 1 ? gps.speed * 3.6 : 35;
    setEtaMin(Math.max(1, Math.ceil((km / speedKmh) * 60)));

    let cancelled = false;
    (async () => {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${gps.lng},${gps.lat};${target.lng},${target.lat}` +
          `?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("route http " + res.status);
        const data = await res.json();
        const coords = data?.routes?.[0]?.geometry?.coordinates as
          | [number, number][]
          | undefined;
        if (!coords || cancelled) return;
        const latlngs = coords.map(
          (c) => [c[1], c[0]] as [number, number],
        );
        if (routeLine.current) {
          routeLine.current.setLatLngs(latlngs);
        } else {
          routeLine.current = L.polyline(latlngs, {
            color: "#146C43",
            weight: 5,
            opacity: 0.85,
          }).addTo(map);
        }
        const duration = data.routes[0].duration as number | undefined;
        const distance = data.routes[0].distance as number | undefined;
        if (duration != null) setEtaMin(Math.max(1, Math.ceil(duration / 60)));
        if (distance != null) setDistKm(distance / 1000);
        setRouteErr(null);
      } catch {
        if (!cancelled) {
          setRouteErr("Route preview unavailable — distance is approximate");
          // Straight line fallback
          const line: [number, number][] = [pos, [target.lat, target.lng]];
          if (routeLine.current) routeLine.current.setLatLngs(line);
          else if (L && mapRef.current) {
            routeLine.current = L.polyline(line, {
              color: "#146C43",
              weight: 4,
              dashArray: "8 8",
            }).addTo(mapRef.current);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gps, mapReady, target.lat, target.lng, target.label]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white">
      {/* Top HUD */}
      <div className="shrink-0 bg-slate-900/95 border-b border-slate-700 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 space-y-1.5 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              {target.kind === "patient" ? "Navigate to patient" : "Navigate to hospital"}
            </div>
            <div className="text-base font-bold truncate">{target.label}</div>
            {target.address && (
              <div className="text-xs text-slate-300 truncate">{target.address}</div>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-slate-800 border border-slate-600 px-2.5 py-1.5 text-xs font-medium"
            onClick={onClose}
          >
            Exit map
          </button>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-emerald-100">
            {distKm != null ? `${distKm.toFixed(1)} km` : "— km"}
          </span>
          <span className="rounded-full bg-sky-500/20 border border-sky-400/40 px-2.5 py-0.5 text-sky-100">
            ETA {etaMin != null ? `${etaMin} min` : "—"}
          </span>
          <span className="rounded-full bg-sky-500/15 border border-sky-400/30 px-2.5 py-0.5 text-[11px] text-sky-100">
            🔒 Screen Lock Active
          </span>
        </div>
        {routeErr && (
          <p className="text-[11px] text-amber-200/90">{routeErr}</p>
        )}
        {reconnectToast && (
          <p className="text-[11px] text-emerald-300 font-medium">{reconnectToast}</p>
        )}
      </div>

      {/* Map */}
      <div ref={mapEl} className="flex-1 min-h-0 w-full bg-slate-800" />

      {/* Bottom actions */}
      <div className="shrink-0 bg-slate-900/95 border-t border-slate-700 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        <div className="grid gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.busy}
              onClick={a.onClick}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-sm py-3"
            >
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onOpenExternal}
          className="w-full rounded-xl border border-slate-500 text-slate-100 text-xs font-medium py-2.5"
        >
          Open in Google Maps App (External)
        </button>
      </div>
    </div>
  );
}
