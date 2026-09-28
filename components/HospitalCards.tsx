"use client";

import { useMemo, useState } from "react";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";
import { allowedTargets, formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

const PRESET_BAYS = [
  "Trauma Bay 1",
  "Trauma Bay 2",
  "Resus Bay A",
  "Observation Bed 3",
  "General Acute Bay",
];

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
  const [ok, setOk] = useState<string | null>(null);

  // State for Bed Admission Modal / Drawer
  const [admittingReq, setAdmittingReq] = useState<EmergencyRequest | null>(null);
  const [selectedBay, setSelectedBay] = useState<string>("Trauma Bay 1");
  const [customBay, setCustomBay] = useState<string>("");
  const [admitNotes, setAdmitNotes] = useState<string>("");

  async function go(id: string, to: string) {
    setBusy(id);
    setError(null);
    setOk(null);

    const { error: rpcErr } = await supabase.rpc("transition_emergency_state", {
      request_id: id,
      new_state: to,
      actor_role: "hospital",
    });

    setBusy(null);

    if (rpcErr) {
      setError(rpcMessage(rpcErr) || "Failed to update status.");
      return;
    }

    setOk(`Status moved to ${to}`);
    router.refresh();
  }

  async function handleConfirmAdmit() {
    if (!admittingReq) return;
    const finalBay = customBay.trim() || selectedBay;

    setBusy(admittingReq.id);
    setError(null);
    setOk(null);

    try {
      // Calls the atomic RPC which completes the dispatch and decrements capacity
      const { data, error: rpcErr } = await supabase.rpc("hospital_admit_patient", {
        p_request_id: admittingReq.id,
        p_assigned_bay: finalBay,
        p_notes: admitNotes.trim() || null,
      });

      if (rpcErr) throw rpcErr;

      setOk(`Patient successfully admitted to ${finalBay}! Bed count updated.`);
      setAdmittingReq(null);
      setCustomBay("");
      setAdmitNotes("");
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Admission failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!requests.length) {
    return (
      <div className="card p-6 text-center text-sm text-[var(--muted)]">
        No active incoming patient transfers at this time.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {requests.map((r) => {
          const targets = allowedTargets(rules, r.status, "hospital").filter(
            (t) => t !== "Completed",
          );
          const showAdmitButton =
            r.status === "Arrived / intake" || r.status === "En route to hospital";

          return (
            <article
              key={r.id}
              className="card p-4 space-y-3 border-l-4 border-l-blue-600 bg-[var(--surface)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-base flex items-center gap-2">
                    <span>{r.emergency_type || "Emergency Patient"}</span>
                    {r.priority && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                        Priority {r.priority}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {formatLocation(r)} · Reported {timeSince(r.created_at)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
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

                  {r.notes && (
                    <div className="mt-2 rounded-md p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200">
                      <span className="font-bold uppercase tracking-wider block text-[10px] text-red-700 dark:text-red-400 mb-0.5">
                        Clinical Triage & Medical ID:
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed">{r.notes}</p>
                    </div>
                  )}

                  {r.driver?.display_name && (
                    <div className="text-xs mt-2 text-[var(--muted)] flex items-center gap-1.5">
                      <span>🚑</span>
                      <span>
                        Transport Unit:{" "}
                        <strong className="text-[var(--foreground)]">
                          {r.driver.display_name}
                        </strong>{" "}
                        {r.driver.vehicle_label ? `(${r.driver.vehicle_label})` : ""}
                      </span>
                    </div>
                  )}
                </div>

                <StatusBadge status={r.status} />
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-[var(--border,#e5e7eb)] flex flex-wrap items-center gap-2">
                {targets.map((to) => (
                  <button
                    key={to}
                    className="btn text-xs py-2 px-3 border border-[var(--border,#d1d5db)] hover:bg-[var(--surface-raised,#f3f4f6)]"
                    disabled={busy === r.id}
                    onClick={() => go(r.id, to)}
                  >
                    {to.toLowerCase().includes("declin") ? "Decline Transfer" : to}
                  </button>
                ))}

                {showAdmitButton && (
                  <button
                    className="btn btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow"
                    disabled={busy === r.id}
                    onClick={() => {
                      setAdmittingReq(r);
                      setSelectedBay("Trauma Bay 1");
                      setCustomBay("");
                      setAdmitNotes("");
                    }}
                  >
                    <span>🛏️</span>
                    <span>Admit Patient & Assign Bed</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Bed Allocation Modal */}
      {admittingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-2xl bg-[var(--surface)] border border-[var(--border,#e5e7eb)]">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-lg">Hospital Intake & Bed Allocation</h3>
                <p className="text-xs text-[var(--muted)]">
                  {admittingReq.emergency_type} · Patient {admittingReq.contact_phone || "En Route"}
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                onClick={() => setAdmittingReq(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
                  Select Emergency Bay / Bed:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_BAYS.map((bay) => (
                    <button
                      key={bay}
                      type="button"
                      onClick={() => {
                        setSelectedBay(bay);
                        setCustomBay("");
                      }}
                      className={`text-xs p-2.5 rounded-lg border text-left font-medium transition ${
                        selectedBay === bay && !customBay
                          ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                          : "border-[var(--border,#e5e7eb)] hover:bg-[var(--surface-raised,#f3f4f6)]"
                      }`}
                    >
                      {bay}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1">
                  Or Custom Room / Bed Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. ICU Ward 4 - Bed 12"
                  value={customBay}
                  onChange={(e) => setCustomBay(e.target.value)}
                  className="input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1">
                  ER Intake Notes / Attending Doctor:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Received by Dr. Okafor. Stable, IV fluids initiated."
                  value={admitNotes}
                  onChange={(e) => setAdmitNotes(e.target.value)}
                  className="input text-xs w-full"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                className="btn py-2 px-3 text-xs"
                onClick={() => setAdmittingReq(null)}
                disabled={busy === admittingReq.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary py-2 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleConfirmAdmit}
                disabled={busy === admittingReq.id}
              >
                {busy === admittingReq.id ? "Admitting..." : "Confirm Intake & Allocate Bed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <Toast message={error} onClose={() => setError(null)} />}
      {ok && <Toast message={ok} onClose={() => setOk(null)} />}
    </>
  );
}