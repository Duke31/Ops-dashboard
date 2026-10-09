"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmergencyRequest, TransitionRule } from "@/lib/types";
import { allowedTargets, formatLocation, resolvePatientAgeBand } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
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
  requests,
  historyRequests = [],
  rules,
  availableCapacity = null,
}: {
  requests: EmergencyRequest[];
  historyRequests?: EmergencyRequest[];
  rules: TransitionRule[];
  availableCapacity?: number | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Real-time synchronization for hospital intake desk
  useEffect(() => {
    const channel = supabase
      .channel("hospital-intake-sync")
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

  // Admission Modal State
  const [admittingReq, setAdmittingReq] = useState<EmergencyRequest | null>(null);
  const [selectedBay, setSelectedBay] = useState<string>("Trauma Bay 1");
  const [customBay, setCustomBay] = useState<string>("");
  const [admitNotes, setAdmitNotes] = useState<string>("");

  const effectiveBay = customBay.trim() || selectedBay;
  const isFacilityFull = availableCapacity === 0;

  async function go(id: string, to: string) {
    const isAccepting =
      to.toLowerCase().includes("confirm") ||
      to.toLowerCase().includes("matched") ||
      to.toLowerCase().includes("intake");

    if (isAccepting && isFacilityFull) {
      setError(
        "⛔ Cannot accept or confirm emergency: Available bed capacity is 0 (Full/Diversion). Increase available beds above or decline/redirect request.",
      );
      return;
    }

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

    if (isFacilityFull) {
      setError(
        "⛔ Cannot admit patient: Available bed capacity is 0. Please adjust your live bed count above first.",
      );
      return;
    }

    setBusy(admittingReq.id);
    setError(null);
    setOk(null);

    try {
      const { error: rpcErr } = await supabase.rpc("hospital_admit_patient", {
        p_request_id: admittingReq.id,
        p_assigned_bay: effectiveBay,
        p_notes: admitNotes.trim() || null,
      });

      if (rpcErr) throw rpcErr;

      setOk(`Patient admitted to ${effectiveBay}. Capacity updated.`);
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

  return (
    <>
      <div className="space-y-6">
        {/* Active Incoming Emergency Transfers Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
              Incoming Ambulance Transfers ({requests.length})
            </h2>
          </div>

          {isFacilityFull && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border-2 border-red-500/40 text-xs text-red-900 dark:text-red-200 font-semibold flex items-center gap-2">
              <span className="text-base">⛔</span>
              <span>
                Facility is currently in Diversion Mode (0 Beds Available). Patient admissions and intake confirmations are locked until beds are updated above.
              </span>
            </div>
          )}

          {!requests.length ? (
            <div className="card p-6 text-center text-sm text-[var(--muted)]">
              No active incoming patient transfers at this time.
            </div>
          ) : (
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
                    className="card p-4 space-y-3 border-l-4 border-l-blue-600 bg-[var(--surface)] shadow-sm"
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
                          {(() => {
                            const age = resolvePatientAgeBand(r);
                            if (!age) return null;
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-[var(--surface-raised,#f3f4f6)] text-[var(--foreground)] border border-[var(--border,#e5e7eb)]">
                                Age: {age === "unknown" ? "Unknown" : `${age} yrs`}
                              </span>
                            );
                          })()}
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
                      {targets.map((to) => {
                        const isDecline = to.toLowerCase().includes("declin");
                        const isDisabled = busy === r.id || (!isDecline && isFacilityFull);
                        return (
                          <button
                            key={to}
                            className={`btn text-xs py-2 px-3 border border-[var(--border,#d1d5db)] ${
                              isDecline
                                ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                : "hover:bg-[var(--surface-raised,#f3f4f6)]"
                            }`}
                            disabled={isDisabled}
                            onClick={() => go(r.id, to)}
                            title={isDisabled && !isDecline ? "Capacity is 0. Increase beds first." : ""}
                          >
                            {isDecline ? "Decline / Divert" : to}
                          </button>
                        );
                      })}

                      {showAdmitButton && (
                        <button
                          className={`btn text-xs py-2 px-4 font-semibold flex items-center gap-1.5 shadow rounded-lg ${
                            isFacilityFull
                              ? "bg-gray-400 text-white cursor-not-allowed opacity-60"
                              : "btn-primary bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                          disabled={busy === r.id || isFacilityFull}
                          onClick={() => {
                            if (isFacilityFull) {
                              setError("Cannot admit patient: Available bed capacity is 0.");
                              return;
                            }
                            setAdmittingReq(r);
                            setSelectedBay("Trauma Bay 1");
                            setCustomBay("");
                            setAdmitNotes("");
                          }}
                        >
                          <span>🛏️</span>
                          <span>
                            {isFacilityFull ? "⛔ ER Full (0 Beds)" : "Admit Patient & Assign Bed"}
                          </span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Admitted Records & Handover Log History */}
        <section className="space-y-3 pt-4 border-t border-[var(--border,#e5e7eb)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
              <span>📋</span>
              <span>Admitted Records & Handover Log ({historyRequests.length})</span>
            </h2>
          </div>

          {!historyRequests.length ? (
            <p className="text-xs text-[var(--muted)] italic">
              No previous admission records logged yet for this facility.
            </p>
          ) : (
            <div className="grid gap-2.5">
              {historyRequests.slice(0, 10).map((h) => (
                <div
                  key={h.id}
                  className="card p-3 text-xs bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--foreground)]">
                      {h.emergency_type || "Emergency"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Admitted / Completed
                    </span>
                  </div>

                  <div className="text-[var(--muted)] flex flex-wrap gap-x-3 gap-y-1">
                    <span>📍 {formatLocation(h)}</span>
                    {h.contact_phone && <span>📞 {h.contact_phone}</span>}
                    {h.completed_at && (
                      <span>⏱️ Admitted {timeSince(h.completed_at)}</span>
                    )}
                  </div>

                  {h.notes && (
                    <div className="mt-1 pt-1 border-t border-[var(--border,#e2e8f0)] text-[11px] text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                      {h.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Bed Handover Modal */}
      {admittingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="card max-w-lg w-full p-6 space-y-5 shadow-2xl bg-[var(--surface)] border border-[var(--border,#e5e7eb)] rounded-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase block">
                  ER BED HANDOVER & ADMISSION
                </span>
                <h3 className="text-xl font-bold mt-1 text-[var(--foreground)]">
                  Admit {admittingReq.emergency_type || "Emergency Patient"}
                </h3>
              </div>
              <button
                className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1 transition-colors"
                onClick={() => setAdmittingReq(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Transport Unit & Capacity info card */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] text-xs space-y-1.5">
              <div>
                <strong className="text-[var(--foreground)]">Transport Unit:</strong>{" "}
                <span className="text-[var(--muted)]">
                  {admittingReq.driver?.display_name || "Assigned Ambulance"}
                  {admittingReq.driver?.vehicle_label ? ` (${admittingReq.driver.vehicle_label})` : ""}
                </span>
              </div>
              <div>
                <strong className="text-[var(--foreground)]">Location:</strong>{" "}
                <span className="text-[var(--muted)]">{formatLocation(admittingReq)}</span>
              </div>
              <div className="pt-1">
                <strong className="text-[var(--foreground)]">Current ER Bed Capacity:</strong>{" "}
                <span className={`font-bold ${isFacilityFull ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {availableCapacity ?? "—"} beds available
                </span>{" "}
                <span className="text-[var(--muted)] text-[11px]">
                  (will be decremented by 1 upon confirmation)
                </span>
              </div>
            </div>

            {/* Select Receiving Bed / Trauma Bay (2-column grid) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                Select Receiving Bed / Trauma Bay:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_BAYS.map((bay) => {
                  const isSelected = selectedBay === bay && !customBay;
                  return (
                    <button
                      key={bay}
                      type="button"
                      disabled={isFacilityFull}
                      onClick={() => {
                        setSelectedBay(bay);
                        setCustomBay("");
                      }}
                      className={`text-xs py-2.5 px-3 rounded-lg border font-medium text-left transition ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
                          : "border-[var(--border,#e5e7eb)] hover:bg-[var(--surface-raised,#f3f4f6)] text-[var(--foreground)]"
                      }`}
                    >
                      {bay}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom bed/room input */}
            <div className="space-y-1">
              <label className="block text-xs text-[var(--muted)]">
                Or specify custom bed/room:
              </label>
              <input
                type="text"
                disabled={isFacilityFull}
                placeholder="e.g. Ward 4C - Bed 12"
                value={customBay}
                onChange={(e) => setCustomBay(e.target.value)}
                className="input text-xs w-full py-2.5 px-3 rounded-lg"
              />
            </div>

            {/* Admission Handover Notes */}
            <div className="space-y-1">
              <label className="block text-xs text-[var(--muted)]">
                Admission Handover Notes (Optional):
              </label>
              <textarea
                rows={3}
                disabled={isFacilityFull}
                placeholder="Assigned physician, initial vitals taken at triage bay, or special instructions..."
                value={admitNotes}
                onChange={(e) => setAdmitNotes(e.target.value)}
                className="input text-xs w-full py-2 px-3 rounded-lg"
              />
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 border-t border-[var(--border,#e5e7eb)] flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn py-2.5 px-4 text-xs font-semibold border rounded-lg"
                onClick={() => setAdmittingReq(null)}
                disabled={busy === admittingReq.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn py-2.5 px-5 text-xs font-bold text-white rounded-lg shadow-md flex-1 text-center ${
                  isFacilityFull
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
                onClick={handleConfirmAdmit}
                disabled={busy === admittingReq.id || isFacilityFull}
              >
                {busy === admittingReq.id
                  ? "Admitting..."
                  : isFacilityFull
                  ? "⛔ Cannot Admit — 0 Beds Available"
                  : `Confirm Admission to ${effectiveBay}`}
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
