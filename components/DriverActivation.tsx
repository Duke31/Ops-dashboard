"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { rpcMessage } from "@/lib/rpc-error";

export type DriverRow = {
  id: string;
  display_name: string | null;
  vehicle_label: string | null;
  hospital_id: string | null;
  active: boolean | null;
  hospital?: { name: string } | null;
};

export function DriverActivation({ drivers }: { drivers: DriverRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(drivers.map((d) => [d.id, Boolean(d.active)])),
  );

  async function flip(d: DriverRow, next: boolean) {
    setError(null);
    setOk(null);
    setBusy(d.id);
    const prev = activeMap[d.id];
    setActiveMap((m) => ({ ...m, [d.id]: next }));
    try {
      const { error: err } = await supabase.rpc("admin_set_driver_active", {
        p_driver_id: d.id,
        p_active: next,
      });
      if (err) throw err;
      setOk(
        next
          ? `${d.display_name ?? "Driver"} marked active.`
          : `${d.display_name ?? "Driver"} stood down.`,
      );
      router.refresh();
    } catch (e) {
      setActiveMap((m) => ({ ...m, [d.id]: prev }));
      setError(rpcMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {drivers.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No drivers yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Vehicle</th>
                <th>Hospital</th>
                <th>Status</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const on = activeMap[d.id] ?? Boolean(d.active);
                return (
                  <tr key={d.id}>
                    <td className="font-medium">{d.display_name || "—"}</td>
                    <td>{d.vehicle_label || "—"}</td>
                    <td>{d.hospital?.name || "—"}</td>
                    <td>
                      {on ? (
                        <span className="badge badge-ok">Active</span>
                      ) : (
                        <span className="badge badge-warn">
                          Pending activation
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        disabled={busy === d.id}
                        onClick={() => flip(d, !on)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          on ? "bg-[var(--accent)]" : "bg-[#d0d5dd]"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            on ? "left-[22px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </div>
  );
}
