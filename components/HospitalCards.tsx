"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";
import { allowedTargets, formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

const PRESET_BAYS = [
  "Trauma Bay 1",
  "Trauma Bay 2",
  "Resuscitation Suite",
  "Critical Care / ICU-1",
  "Acute Observation 1",
  "Acute Observation 2",
  "Pediatric Bay",
  "General Triage Bed",
];

export function HospitalCards({
  requests: initialRequests,
  rules,
  hospitalId,
  currentCapacity,
}: {
  requests: EmergencyRequest[];
  rules: TransitionRule[];
  hospitalId?: string;
  currentCapacity?: number | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [requests, setRequests] = useState<EmergencyRequest[]>(initialRequests);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Admission Modal State
  const [admittingReq, setAdmittingReq] = useState<EmergencyRequest | null>(null);
  const [assignedBay, setAssignedBay] = useState<string>("Trauma Bay 1");
  const [customBay, setCustomBay] = useState<string>("");
  const [admitNotes, setAdmitNotes] = useState<string>("");

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  // Real-time listener for incoming ambulances and triage status updates
  useEffect(() => {
    const channel = supabase
      .channel("hospital-intake-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_requests",
          filter: hospitalId ? `hospital_id=eq.${hospitalId}` : undefined,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, hospitalId]);

  async function goTransition(id: string, to: string) {
    setBusy(id);
    setError(null);
    setOk(null);

    try {
      const { error: rpcErr } = await supabase.rpc("transition_emergency_state", {
        request_id: id,
        new_state: to,
        actor_role: "hospital",
      });

      if (rpcErr) throw rpcErr;
      setOk(`Emergency status updated to ${to}`);
      router.refresh();
    } catch (err: unknown) {
      setError(rpcMessage(err) || "Failed to update emergency state");
    } finally {
      setBusy(null);
    }
  }

  // Handle Full Bed Admission Flow (Bed Assignment + Capacity Decrement + Transition to Completed)
  async function confirmAdmission() {
    if (!admittingReq) return;
    const req = admittingReq;
    const finalBay = customBay.trim() || assignedBay;

    setBusy(req.id);
    setError(null);
    setOk(null);

    try {
      // 1. Decrement available capacity on hospital record if hospitalId exists
      const hId = hospitalId || req.hospital_id;
      if (hId) {
        const { data: hosp } = await supabase
          .from("hospitals")
          .select("available_capacity")
          .eq("id", hId)
          .maybeSingle();

        const currentVal = hosp?.available_capacity ?? currentCapacity;
        if (currentVal != null && currentVal > 0) {
          await supabase
            .from("hospitals")
            .update({ available_capacity: Math.max(0, currentVal - 1) })
            .eq("id", hId);
        }
      }

      // 2. Append Bed/Bay assignment note to request record
      const admissionStamp = `[Admitted to ${finalBay} at ${new Date().toLocaleTimeString()}]${
        admitNotes.trim() ? ` Notes: ${admitNotes.trim()}` : ""
      }`;
      const updatedNotes = req.notes ? `${req.notes}\n${admissionStamp}` : admissionStamp;

      await supabase
        .from("emergency_requests")
        .update({ notes: updatedNotes })
        .eq("id", req.id);

      // 3. Transition state to Completed
      const { error: rpcErr } = await supabase.rpc("transition_emergency_state", {
        request_id: req.id,
        new_state: "Completed",
        actor_role: "hospital",
      });

      if (rpcErr) throw rpcErr;

      setOk(`Patient successfully admitted to ${finalBay}. Bed capacity updated.`);
      setAdmittingReq(null);
      setCustomBay("");
      setAdmitNotes("");
      router.refresh();
    } catch (err: unknown) {
      setError(rpcMessage(err) || "Failed to complete bed admission");
    } finally {
      setBusy(null);
    }
  }

  if (!requests.length) {
    return (
      <div className="card p-8 text-center space-y-2">
        <div className="text-3xl">🏥</div>
        <h3 className="font-semibold text-base">Intake Queue Clear</h3>
        <p className="text-sm text-[var(--muted)]">
          No inbound ambulances or pending ER admissions for this site.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3.5">
        {requests.map((r) => {
          const targets = allowedTargets(rules, r.status, "hospital").filter(
            (t) => t !== "Completed",
          );

          const isReadyForAdmission =
            r.status === "Arrived / intake" ||
            r.status.toLowerCase().includes("arrived") ||
            r.status.toLowerCase().includes("intake") ||
            r.status.toLowerCase().includes("hospital");

          return (
            <article
              key={r.id}
              className={`card p-4 transition-all ${
                isReadyForAdmission
                  ? "border-2 border-emerald-500/40 bg-emerald-500/5 shadow-sm"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">
                      {r.emergency_type || "Emergency"}
                    </span>
                    {r.priority && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        Priority {r.priority}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-[var(--muted)] mt-0.5">
                    {formatLocation(r)} · Reported {timeSince(r.created_at)}
                  </div>

                  {/* Patient Vitals & Demographics Tags */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    {r.patient_age_band && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-semibold bg-[var(--surface-raised,#f3f4f6)] text-[var(--foreground)] border border-[var(--border,#e5e7eb)]">
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

                  {/* Clinical Triage & Allergy Notes */}
                  {r.notes && (
                    <div className="mt-2.5 rounded-md p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200">
                      <span className="font-bold uppercase tracking-wider block text-[10px] text-red-700 dark:text-red-400 mb-1">
                        🚨 Inbound Clinical Triage & Medical Alert:
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed font-medium">
                        {r.notes}
                      </p>
                    </div>
                  )}

                  {/* Transport Ambulance Info */}
                  {r.driver?.display_name && (
                    <div className="text-sm mt-2 text-[var(--muted)] flex items-center gap-1.5 font-medium">
                      <span>🚑 Transport Unit:</span>
                      <strong className="text-[var(--foreground)]">
                        {r.driver.display_name}
                      </strong>
                      {r.driver.vehicle_label ? (
                        <span className="text-xs text-[var(--muted)]">
                          ({r.driver.vehicle_label})
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <StatusBadge status={r.status} />
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-[var(--line,#e5e7eb)] flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                  disabled={busy === r.id}
                  onClick={() => {
                    setAdmittingReq(r);
                    setAssignedBay("Trauma Bay 1");
                    setCustomBay("");
                    setAdmitNotes("");
                  }}
                >
                  <span>🛏️</span>
                  <span>Admit Patient & Assign Bed</span>
                </button>

                {targets.map((to) => (
                  <button
                    key={to}
                    className="btn btn-ghost text-xs"
                    disabled={busy === r.id}
                    onClick={() => goTransition(r.id, to)}
                  >
                    {to.toLowerCase().includes("declin") ? "Decline Transfer" : to}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {/* Bed Assignment & Admission Modal */}
      {admittingReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-5 space-y-4 shadow-2xl bg-[var(--surface,#ffffff)] border border-[var(--border,#e2e8f0)]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                  ER Bed Handover & Admission
                </span>
                <h3 className="text-lg font-bold mt-0.5">
                  Admit {admittingReq.emergency_type || "Patient"}
                </h3>
              </div>
              <button
                type="button"
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                onClick={() => setAdmittingReq(null)}
              >
                ✕ Close
              </button>
            </div>

            <div className="text-xs text-[var(--muted)] bg-[var(--surface-raised,#f8fafc)] p-3 rounded border border-[var(--border,#e2e8f0)]">
              <div>
                <strong>Transport Unit:</strong>{" "}
                {admittingReq.driver?.display_name || "Assigned Ambulance"}
              </div>
              <div>
                <strong>Location:</strong> {formatLocation(admittingReq)}
              </div>
              <div className="mt-1">
                <strong>Current ER Bed Capacity:</strong>{" "}
                <span className="font-bold text-emerald-600">
                  {currentCapacity != null ? `${currentCapacity} beds available` : "Tracking active"}
                </span>{" "}
                (will be decremented by 1 upon confirmation)
              </div>
            </div>

            {/* Bay / Bed Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold block">
                Select Receiving Bed / Trauma Bay:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_BAYS.map((bay) => (
                  <button
                    key={bay}
                    type="button"
                    onClick={() => {
                      setAssignedBay(bay);
                      setCustomBay("");
                    }}
                    className={`px-2.5 py-1.5 text-xs rounded text-left border transition-colors ${
                      assignedBay === bay && !customBay
                        ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                        : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border,#e2e8f0)] hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {bay}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Bed Input */}
            <div className="space-y-1">
              <label className="text-[11px] text-[var(--muted)] block">
                Or specify custom bed/room:
              </label>
              <input
                className="input text-xs"
                placeholder="e.g. Ward 4C - Bed 12"
                value={customBay}
                onChange={(e) => setCustomBay(e.target.value)}
              />
            </div>

            {/* Admission Handover Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold block">
                Admission Handover Notes (Optional):
              </label>
              <textarea
                className="input text-xs min-h-[64px] resize-none"
                placeholder="Assigned physician, initial vitals taken at triage bay, or special instructions..."
                value={admitNotes}
                onChange={(e) => setAdmitNotes(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--line,#e5e7eb)]">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => setAdmittingReq(null)}
                disabled={busy === admittingReq.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2"
                disabled={busy === admittingReq.id}
                onClick={confirmAdmission}
              >
                {busy === admittingReq.id
                  ? "Admitting Patient…"
                  : `Confirm Admission to ${customBay.trim() || assignedBay}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="toast toast-error flex items-start justify-between gap-3">
          <p className="leading-5">{error}</p>
          <button
            className="text-xs font-semibold opacity-70 hover:opacity-100"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {ok && (
        <div className="toast toast-ok flex items-start justify-between gap-3">
          <p className="leading-5">{ok}</p>
          <button
            className="text-xs font-semibold opacity-70 hover:opacity-100"
            onClick={() => setOk(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

export default HospitalCards;