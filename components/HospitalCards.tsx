"use client";

import { useMemo, useState } from "react";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";
import { allowedTargets, formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function HospitalCards({
  requests,
  rules,
}: {
  requests: EmergencyRequest[];
  rules: TransitionRule[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(id: string, to: string) {
    setBusy(id);
    setError(null);
    const { error: rpcErr } = await supabase.rpc("transition_emergency_state", {
      request_id: id,
      new_state: to,
      actor_role: "hospital",
    });
    setBusy(null);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    router.refresh();
  }

  if (!requests.length) {
    return <p className="text-sm text-[var(--muted)]">No incoming requests.</p>;
  }

  return (
    <>
      <div className="grid gap-3">
        {requests.map((r) => {
          const targets = allowedTargets(rules, r.status, "hospital").filter(
            (t) => t !== "Completed",
          );
          const showReceived = r.status === "Arrived / intake";
          return (
            <article key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">
                    {r.emergency_type || "Emergency"}
                  </div>
                  <div className="text-sm text-[var(--muted)] mt-0.5">
                    {formatLocation(r)} · {timeSince(r.created_at)}
                  </div>
                  {r.driver?.display_name && (
                    <div className="text-sm mt-1">
                      Driver: {r.driver.display_name}
                      {r.driver.vehicle_label
                        ? ` (${r.driver.vehicle_label})`
                        : ""}
                    </div>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {targets.map((to) => (
                  <button
                    key={to}
                    className="btn btn-primary"
                    disabled={busy === r.id}
                    onClick={() => go(r.id, to)}
                  >
                    {to.toLowerCase().includes("declin") ? "Decline" : to}
                  </button>
                ))}
                {showReceived && (
                  <button
                    className="btn btn-primary"
                    disabled={busy === r.id}
                    onClick={() => go(r.id, "Completed")}
                  >
                    Mark Patient Received
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </>
  );
}
