"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";
import { allowedTargets, formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

export function HospitalCards({
  requests = [],
  rules = [],
}: {
  requests: EmergencyRequest[];
  rules: TransitionRule[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const ch = supabase
      .channel("hospital-intake-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    const interval = setInterval(() => router.refresh(), 5000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
    };
  }, [supabase, router]);

  async function handleStateTransition(id: string, toState: string) {
    setBusy(id);
    setError(null);
    setOk(null);

    try {
      // 1. Transition state
      const { error: rpcErr } = await supabase.rpc("transition_emergency_state", {
        request_id: id,
        new_state: toState,
        actor_role: "hospital",
      });

      if (rpcErr) throw rpcErr;

      setOk(`Emergency status updated to "${toState}"`);
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Could not update status.");
    } finally {
      setBusy(null);
    }
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="card p-8 text-center space-y-2">
        <div className="text-3xl">🏥</div>
        <div className="font-semibold text-sm">Emergency Bays Clear</div>
        <p className="text-xs text-[var(--muted)]">
          No inbound ambulances or pending patient handovers for this facility.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => {
        const targets = allowedTargets(rules, r.status, "hospital").filter(
          (t) => t !== "Completed",
        );
        const isArrived = r.status === "Arrived / intake";

        return (
          <article
            key={r.id}
            className={`card p-4 space-y-3 border-2 transition-all ${
              isArrived ? "border-emerald-500/50 shadow-md" : "border-[var(--border,#e2e8f0)]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-base flex items-center gap-2">
                  <span>{r.emergency_type || "Emergency"}</span>
                  {isArrived && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold uppercase">
                      🚑 Ambulance At ER Bay
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">
                  {formatLocation(r)} · {timeSince(r.created_at)}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {r.patient_age_band && (
                    <span className="px-2 py-0.5 rounded font-medium bg-[var(--surface-raised,#f3f4f6)] text-[var(--foreground)] border border-[var(--border,#e5e7eb)]">
                      Age: {r.patient_age_band === "unknown" ? "Unknown" : `${r.patient_age_band} yrs`}
                    </span>
                  )}
                  {r.contact_phone && (
                    <a
                      href={`tel:${r.contact_phone}`}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      📞 Patient: {r.contact_phone}
                    </a>
                  )}
                  {r.driver?.display_name && (
                    <span className="text-[var(--muted)]">
                      🚑 Driver: <strong>{r.driver.display_name}</strong>
                    </span>
                  )}
                </div>

                {r.notes && (
                  <div className="mt-2.5 rounded-md p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200">
                    <span className="font-bold uppercase tracking-wider block text-[10px] text-red-700 dark:text-red-400 mb-0.5">
                      Clinical Triage & Medical ID:
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed">{r.notes}</p>
                  </div>
                )}
              </div>
              <StatusBadge status={r.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border,#e2e8f0)]">
              {targets.map((to) => (
                <button
                  key={to}
                  className="btn btn-secondary text-xs"
                  disabled={busy === r.id}
                  onClick={() => handleStateTransition(r.id, to)}
                >
                  {to.toLowerCase().includes("declin") ? "Decline" : to}
                </button>
              ))}

              {isArrived && (
                <button
                  className="btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 shadow"
                  disabled={busy === r.id}
                  onClick={() => handleStateTransition(r.id, "Completed")}
                >
                  <span>✅ Admit Patient & Assign Bed (Complete)</span>
                </button>
              )}
            </div>
          </article>
        );
      })}

      <Toast message={error} kind="error" onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </div>
  );
}