"use client";

import { useEffect, useMemo, useState } from "react";
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

  // Live Realtime listener + 4-second auto-sync
  useEffect(() => {
    const channel = supabase
      .channel("hospital-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    const interval = setInterval(() => {
      router.refresh();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, router]);

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
    return (
      <div className="card p-6 text-center text-sm text-[var(--muted)]">
        <p>No active incoming requests at this moment.</p>
        <span className="inline-block mt-2 text-xs text-emerald-600 font-medium">
          ● Listening live for incoming patient admissions...
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {requests.map((r) => {
          // Filter out transitions that belong to dispatchers or drivers
          const targets = allowedTargets(rules, r.status, "hospital").filter(
            (t) => t !== "Completed" && !t.toLowerCase().includes("driver"),
          );
          const showReceived = r.status === "Arrived / intake";
          return (
            <article key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-base">
                    {r.emergency_type || "Emergency"}
                  </div>
                  <div className="text-sm text-[var(--muted)] mt-0.5">
                    {formatLocation(r)} · {timeSince(r.created_at)}
                  </div>

                  {/* Patient Contact & Age Group */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {r.patient_age_band && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-[var(--surface-raised,#f3f4f6)] text-[var(--foreground)] border border-[var(--border,#e5e7eb)]">
                        Age: {r.patient_age_band === "unknown" ? "Unknown" : `${r.patient_age_band} yrs`}
                      </span>
                    )}
                    {r.contact_phone && (
                      <a
                        href={`tel:${r.contact_phone}`}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>📞</span>
                        <span>Patient: {r.contact_phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Highlighted Clinical Triage & Medical ID */}
                  {r.notes && (
                    <div className="mt-2.5 rounded-md p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200">
                      <span className="font-bold uppercase tracking-wider block text-[10px] text-red-700 dark:text-red-400 mb-0.5">
                        Clinical Triage & Medical ID:
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed">{r.notes}</p>
                    </div>
                  )}

                  {/* Assigned Responder */}
                  {r.driver?.display_name && (
                    <div className="text-sm mt-2 text-[var(--muted)] flex items-center gap-1.5">
                      <span>🚑</span>
                      <span>
                        Driver: <strong className="text-[var(--foreground)]">{r.driver.display_name}</strong>
                        {r.driver.vehicle_label ? ` (${r.driver.vehicle_label})` : ""}
                      </span>
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