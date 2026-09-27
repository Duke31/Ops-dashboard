"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";
import { formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

export function HospitalCards({
  requests,
  rules,
  hospitalId,
  profileRole = "hospital",
}: {
  requests: EmergencyRequest[];
  rules: TransitionRule[];
  hospitalId: string;
  profileRole?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Realtime subscription for incoming patients
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

  async function handleAdmitPatient(requestId: string) {
    setBusy(requestId);
    setError(null);
    setOk(null);

    try {
      const effectiveRole = profileRole === "admin" ? "admin" : "hospital";

      // 1. Transition state to 'Completed'
      const { error: rpcErr } = await supabase.rpc("transition_emergency_state", {
        request_id: requestId,
        new_state: "Completed",
        actor_role: effectiveRole,
      });

      if (rpcErr) throw rpcErr;

      // 2. Decrement available bed capacity by 1 if hospital has available beds
      try {
        const { data: hosp } = await supabase
          .from("hospitals")
          .select("available_capacity")
          .eq("id", hospitalId)
          .maybeSingle();

        if (hosp && hosp.available_capacity != null && hosp.available_capacity > 0) {
          await supabase
            .from("hospitals")
            .update({ available_capacity: hosp.available_capacity - 1 })
            .eq("id", hospitalId);
        }
      } catch (capErr) {
        console.warn("Capacity auto-decrement notice:", capErr);
      }

      setOk("Patient admitted to ER & bed count updated successfully.");
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Could not complete patient admission.");
    } finally {
      setBusy(null);
    }
  }

  if (!requests.length) {
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

  // Separate patients already at hospital bay vs en route
  const arrivedPatients = requests.filter((r) => r.status === "Arrived / intake");
  const enRoutePatients = requests.filter((r) => r.status !== "Arrived / intake");

  return (
    <div className="space-y-4">
      {/* 1. At Intake Bay (Immediate Handover) */}
      {arrivedPatients.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              At Intake Bay · Ready for Admission ({arrivedPatients.length})
            </h3>
          </div>

          <div className="grid gap-3">
            {arrivedPatients.map((r) => (
              <article
                key={r.id}
                className="card p-5 border-2 border-emerald-500/50 shadow-md bg-[var(--surface)] space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      🚑 Ambulance Arrived Outside Bay
                    </span>
                    <h4 className="text-lg font-bold mt-1">{r.emergency_type || "Emergency"}</h4>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      From: {formatLocation(r)} · Dispatched {timeSince(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* Patient Information & Clinical Details */}
                <div className="p-3 rounded-lg bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {r.patient_age_band && (
                      <span className="px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                        Age: {r.patient_age_band === "unknown" ? "Unknown" : `${r.patient_age_band} yrs`}
                      </span>
                    )}
                    {r.contact_phone && (
                      <span className="text-[var(--muted)]">
                        Phone: <strong className="text-[var(--foreground)]">{r.contact_phone}</strong>
                      </span>
                    )}
                    {r.driver?.display_name && (
                      <span className="text-[var(--muted)]">
                        Paramedic: <strong className="text-[var(--foreground)]">{r.driver.display_name}</strong>
                        {r.driver.vehicle_label ? ` (${r.driver.vehicle_label})` : ""}
                      </span>
                    )}
                  </div>

                  {r.notes && (
                    <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200 text-xs">
                      <span className="font-bold text-[10px] uppercase tracking-wider block text-red-700 dark:text-red-400">
                        Clinical Triage & Medical ID
                      </span>
                      <p className="whitespace-pre-wrap font-medium mt-0.5">{r.notes}</p>
                    </div>
                  )}
                </div>

                {/* Admission Handover Button */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-[var(--muted)]">
                    Paramedic waiting at triage desk for bed handover.
                  </span>
                  <button
                    disabled={busy === r.id}
                    onClick={() => handleAdmitPatient(r.id)}
                    className="btn py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow flex items-center gap-2"
                  >
                    <span>✅ Admit Patient & Assign Bed</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* 2. En Route Patients (Inbound ambulances) */}
      {enRoutePatients.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Inbound Ambulances In Transit ({enRoutePatients.length})
            </h3>
          </div>

          <div className="grid gap-3">
            {enRoutePatients.map((r) => (
              <article key={r.id} className="card p-4 border border-[var(--border,#e2e8f0)] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-base">{r.emergency_type || "Emergency"}</h4>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Pickup: {formatLocation(r)} · Dispatched {timeSince(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {r.patient_age_band && (
                    <span className="px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-[var(--foreground)]">
                      Age: {r.patient_age_band === "unknown" ? "Unknown" : `${r.patient_age_band} yrs`}
                    </span>
                  )}
                  {r.driver?.display_name && (
                    <span className="text-[var(--muted)]">
                      Ambulance: <strong className="text-[var(--foreground)]">{r.driver.display_name}</strong>
                    </span>
                  )}
                </div>

                {r.notes && (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
                    <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-700 dark:text-amber-400">
                      Triage Briefing for Prep
                    </span>
                    <p className="whitespace-pre-wrap mt-0.5">{r.notes}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      <Toast message={error} kind="error" onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </div>
  );
}