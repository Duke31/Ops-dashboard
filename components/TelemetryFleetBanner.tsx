"use client";

import { useEffect, useMemo, useState } from "react";
import type { Driver, EmergencyRequest } from "@/lib/types";

const STALL_MS = 15_000;

function isStalled(last: string | null | undefined, now: number) {
  if (!last) return true;
  const t = Date.parse(last);
  if (Number.isNaN(t)) return true;
  return now - t > STALL_MS;
}

function networkLabel(raw: string | null | undefined) {
  if (!raw) return null;
  const n = raw.toLowerCase();
  if (n === "4g" || n === "lte") return "4G";
  if (n === "3g") return "3G";
  if (n === "2g" || n === "slow-2g") return "2G - Degraded";
  if (n === "wifi" || n === "wlan") return "Wi‑Fi";
  if (n === "offline") return "Offline";
  return raw.toUpperCase();
}

function isLowBattery(d: Driver) {
  return (
    d.battery_level != null &&
    d.battery_level <= 20 &&
    d.is_charging === false
  );
}

export function TelemetryFleetBanner({
  drivers,
  requests,
}: {
  drivers: Driver[];
  requests: EmergencyRequest[];
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(id);
  }, []);

  const activeDriverIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of requests) {
      if (
        r.driver_id &&
        !["Completed", "Cancelled / failed"].includes(r.status)
      ) {
        ids.add(r.driver_id);
      }
    }
    return ids;
  }, [requests]);

  const activeUnits = useMemo(
    () => drivers.filter((d) => activeDriverIds.has(d.id)),
    [drivers, activeDriverIds],
  );

  const stalled = useMemo(
    () => activeUnits.filter((d) => isStalled(d.last_location_at, now)),
    [activeUnits, now],
  );

  const lowBat = useMemo(
    () => activeUnits.filter(isLowBattery),
    [activeUnits],
  );

  if (activeUnits.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {stalled.length > 0 && (
        <div className="rounded-lg border border-orange-400/60 bg-orange-50 dark:bg-orange-950/40 px-3 py-2.5 text-sm text-orange-950 dark:text-orange-100">
          <div className="font-semibold flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
            </span>
            Telemetry stalled ({stalled.length})
          </div>
          <ul className="mt-1.5 space-y-1 text-xs">
            {stalled.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-orange-500/15 border border-orange-500/40 px-2 py-0.5 font-medium">
                  Telemetry Stalled
                </span>
                <span>
                  {d.display_name || "Unit"}
                  {d.vehicle_label ? ` · ${d.vehicle_label}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm">
        <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">
          Active responders
        </div>
        <ul className="space-y-2">
          {activeUnits.map((d) => {
            const net = networkLabel(d.network_type);
            const low = isLowBattery(d);
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-2 text-xs"
              >
                <span className="font-medium">
                  {d.display_name || "Unit"}
                  {d.vehicle_label ? ` · ${d.vehicle_label}` : ""}
                </span>
                {d.battery_level != null && (
                  <span
                    className={
                      low
                        ? "inline-flex items-center gap-1 rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 font-semibold text-red-700 dark:text-red-300 animate-pulse"
                        : "inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5"
                    }
                  >
                    {low
                      ? `⚠️ Low Bat (${d.battery_level}%)`
                      : `${d.is_charging ? "⚡" : "🔋"} ${d.battery_level}%`}
                  </span>
                )}
                {net && (
                  <span
                    className={
                      net.includes("2G") || net === "Offline"
                        ? "rounded-full bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-amber-900 dark:text-amber-100"
                        : "rounded-full bg-slate-500/10 border border-slate-400/30 px-2 py-0.5"
                    }
                  >
                    {net}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {lowBat.length > 0 && (
          <p className="mt-2 text-[11px] text-red-700 dark:text-red-300">
            {lowBat.length} unit(s) at risk of GPS drop from low battery.
          </p>
        )}
      </div>
    </div>
  );
}
