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

  const stalled = useMemo(() => {
    return drivers.filter(
      (d) => activeDriverIds.has(d.id) && isStalled(d.last_location_at, now),
    );
  }, [drivers, activeDriverIds, now]);

  if (stalled.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-orange-400/60 bg-orange-50 dark:bg-orange-950/40 px-3 py-2.5 text-sm text-orange-950 dark:text-orange-100">
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
            <span className="text-orange-800/80 dark:text-orange-200/80">
              last fix:{" "}
              {d.last_location_at
                ? new Date(d.last_location_at).toLocaleTimeString()
                : "never"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
