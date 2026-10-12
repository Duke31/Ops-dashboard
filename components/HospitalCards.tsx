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
import { useDeskAlerts } from "@/components/alerts/DeskAlertProvider";
import { parseSBARHandover, formatSBARSummary, SBARHandover } from "@/lib/clinicalProtocols";

const PRESET_BAYS = [
  "Obstetric / L&D Theater",
  "Trauma Red Bay 1",
  "Trauma Bay 2",
  "Resuscitation Suite",
  "Critical Care / ICU-1",
  "Acute Observation 1",
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
  const { highlightedRequestId } = useDeskAlerts();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // SBAR Clinical Inspection Modal State
  const [inspectSbar, setInspectSbar] = useState<{
    request: EmergencyRequest;
    sbar: SBARHandover;
  } | null>(null);

  // Admission Modal State
  const [admittingReq, setAdmittingReq] = useState<EmergencyRequest | null>(null);
  const [selectedBay, setSelectedBay] = useState<string>("Obstetric / L&D Theater");
  const [customBay, setCustomBay] = useState<string>("");
  const [admitNotes, setAdmitNotes] = useState<string>("");

  const effectiveBay = customBay.trim() || selectedBay;
  const isFacilityFull = availableCapacity === 0;

  // Real-time synchronization
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

      setOk(`Patient admitted to ${effectiveBay}. Capacity decremented.`);
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
        {/* Active Inbound Ambulance Transfer Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              Pre-Arrival Inbound Board ({requests.length})
            </h2>
            <span className="text-xs text-slate-500">
              Live updates with SBAR Handover pre-alerts
            </span>
          </div>

          {isFacilityFull && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border-2 border-red-500/40 text-xs text-red-300 font-semibold flex items-center gap-2">
              <span className="text-base">⛔</span>
              <span>
                Facility is currently in Diversion Mode (0 Beds Available). Patient admissions and intake confirmations are locked until beds are updated above.
              </span>
            </div>
          )}

          {!requests.length ? (
            <div className="card p-6 text-center text-sm text-slate-400">
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

                const isHighlighted = highlightedRequestId === r.id;
                const sbar = parseSBARHandover(r.notes);

                return (
                  <article
                    key={r.id}
                    className={`card p-4 space-y-3 border-l-4 border-l-blue-600 bg-slate-900/60 shadow-md transition-all duration-500 ${
                      isHighlighted
                        ? "ring-2 ring-blue-500 bg-blue-950/60 animate-pulse"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-bold text-base text-white flex items-center gap-2">
                          <span>{r.emergency_type || "Emergency Patient"}</span>
                          {r.priority && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-950/80 text-red-300 border border-red-800">
                              Priority {r.priority}
                            </span>
                          )}
                          {sbar && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950/80 text-teal-300 border border-teal-800">
                              SBAR ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatLocation(r)} · Reported {timeSince(r.created_at)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          {(() => {
                            const age = resolvePatientAgeBand(r);
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                {age && age.toLowerCase() !== "unknown"
                                  ? `Age: ${age}`
                                  : age === "unknown"
                                  ? "Age: Unknown"
                                  : "Age: —"}
                              </span>
                            );
                          })()}
                          {r.contact_phone && (
                            <a
                              href={`tel:${r.contact_phone}`}
                              className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:underline"
                            >
                              <span>📞</span>
                              <span>Patient: {r.contact_phone}</span>
                            </a>
                          )}
                        </div>

                        {/* Standardized SBAR Pre-Arrival Review Banner */}
                        {sbar ? (
                          <div className="mt-2.5 p-3 rounded-lg bg-teal-950/30 border border-teal-700/60 text-xs">
                            <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-teal-800/40">
                              <span className="font-bold uppercase tracking-wider text-[10px] text-teal-300 flex items-center gap-1">
                                <span>📋</span> Inbound SBAR Pre-Alert Received
                              </span>
                              <button
                                type="button"
                                onClick={() => setInspectSbar({ request: r, sbar })}
                                className="px-2 py-0.5 bg-teal-700 hover:bg-teal-600 text-white rounded text-[10px] font-bold transition-all"
                              >
                                Review Full SBAR Handover →
                              </button>
                            </div>
                            <div className="text-slate-200 font-medium">
                              {sbar.situation.primaryComplaint}
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              {formatSBARSummary(sbar).background}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                Recommended Bay: <strong>{sbar.recommendation.requiredBay}</strong>
                              </span>
                              {sbar.recommendation.bloodBankPreAlert && (
                                <span className="px-1.5 py-0.2 rounded bg-red-600 text-white font-bold animate-pulse">
                                  🩸 Blood Bank Pre-Alert (O-Neg)
                                </span>
                              )}
                              {sbar.recommendation.theaterPrepRequired && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white font-bold">
                                  🔬 Theater Preparation Active
                                </span>
                              )}
                            </div>
                          </div>
                        ) : r.notes ? (
                          <div className="mt-2 rounded-md p-2.5 text-xs bg-red-950/20 border border-red-900/40 text-red-200">
                            <span className="font-bold uppercase tracking-wider block text-[10px] text-red-400 mb-0.5">
                              Clinical Triage & Medical Notes:
                            </span>
                            <p className="whitespace-pre-wrap leading-relaxed">{r.notes}</p>
                          </div>
                        ) : null}

                        {r.driver?.display_name && (
                          <div className="text-xs mt-2 text-slate-400 flex items-center gap-1.5">
                            <span>🚑</span>
                            <span>
                              Transport Unit:{" "}
                              <strong className="text-slate-200">
                                {r.driver.display_name}
                              </strong>{" "}
                              {r.driver.vehicle_label ? `(${r.driver.vehicle_label})` : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      <StatusBadge status={r.status} />
                    </div>

                    {/* Action buttons & Bed Assignment Workflow */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                      {targets.map((to) => {
                        const isDecline = to.toLowerCase().includes("declin");
                        const isDisabled = busy === r.id || (!isDecline && isFacilityFull);
                        return (
                          <button
                            key={to}
                            className={`btn text-xs py-2 px-3 border border-slate-700 ${
                              isDecline
                                ? "text-red-400 hover:bg-red-950/30"
                                : "hover:bg-slate-800 text-slate-200"
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
                              ? "bg-gray-600 text-white cursor-not-allowed opacity-60"
                              : "btn-primary bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                          disabled={busy === r.id || isFacilityFull}
                          onClick={() => {
                            if (isFacilityFull) {
                              setError("Cannot admit patient: Available bed capacity is 0.");
                              return;
                            }
                            setAdmittingReq(r);
                            if (sbar?.recommendation.requiredBay) {
                              setSelectedBay(sbar.recommendation.requiredBay);
                            }
                            setCustomBay("");
                            setAdmitNotes("");
                          }}
                        >
                          <span>🛏️</span>
                          <span>
                            {isFacilityFull ? "⛔ ER Full (0 Beds)" : "Acknowledge & Assign Bed"}
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
        <section className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>📋</span>
              <span>Admitted Records & Handover Log ({historyRequests.length})</span>
            </h2>
          </div>

          {!historyRequests.length ? (
            <p className="text-xs text-slate-500 italic">
              No previous admission records logged yet for this facility.
            </p>
          ) : (
            <div className="grid gap-2.5">
              {historyRequests.slice(0, 10).map((h) => (
                <div
                  key={h.id}
                  className="card p-3 text-xs bg-slate-900/40 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-200">
                      {h.emergency_type || "Emergency"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                      Admitted / Completed
                    </span>
                  </div>

                  <div className="text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                    <span>📍 {formatLocation(h)}</span>
                    {h.contact_phone && <span>📞 {h.contact_phone}</span>}
                    {h.completed_at && (
                      <span>⏱️ Admitted {timeSince(h.completed_at)}</span>
                    )}
                  </div>

                  {h.notes && (
                    <div className="mt-1 pt-1 border-t border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {h.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* SBAR Full Handover Inspection Modal */}
      {inspectSbar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card max-w-lg w-full p-6 space-y-4 bg-slate-900 border border-teal-500/50 rounded-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-teal-400 tracking-wider uppercase block">
                  CLINICAL SBAR HANDOVER
                </span>
                <h3 className="text-lg font-bold text-white">
                  {inspectSbar.request.emergency_type} Transfer Pre-Alert
                </h3>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-white font-bold"
                onClick={() => setInspectSbar(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="font-bold text-teal-400 text-[10px] uppercase block">Situation:</span>
                <p className="mt-1 font-semibold">{inspectSbar.sbar.situation.primaryComplaint}</p>
                <p className="text-slate-400 mt-0.5">Vitals: {inspectSbar.sbar.situation.vitalsSummary}</p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="font-bold text-teal-400 text-[10px] uppercase block">Background:</span>
                <p className="mt-1 text-slate-300">{formatSBARSummary(inspectSbar.sbar).background}</p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="font-bold text-teal-400 text-[10px] uppercase block">Assessment:</span>
                <p className="mt-1 text-slate-300">{inspectSbar.sbar.assessment.fieldImpression}</p>
                <p className="text-amber-400 mt-0.5 font-medium">Stability: {inspectSbar.sbar.assessment.stability}</p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-teal-900/60">
                <span className="font-bold text-teal-400 text-[10px] uppercase block">Recommendation:</span>
                <p className="mt-1 font-semibold text-white">Target Bay: {inspectSbar.sbar.recommendation.requiredBay}</p>
                <div className="mt-2 flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inspectSbar.sbar.recommendation.bloodBankPreAlert ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    Blood Bank: {inspectSbar.sbar.recommendation.bloodBankPreAlert ? 'PRE-ALERTED' : 'Standby'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inspectSbar.sbar.recommendation.theaterPrepRequired ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    Theater Prep: {inspectSbar.sbar.recommendation.theaterPrepRequired ? 'ACTIVE' : 'Standby'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                className="btn btn-primary px-5 text-xs"
                onClick={() => setInspectSbar(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bed Handover Modal */}
      {admittingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card max-w-lg w-full p-6 space-y-5 bg-slate-900 border border-slate-700 rounded-2xl text-slate-100">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase block">
                  FACILITY BED HANDOVER & ADMISSION
                </span>
                <h3 className="text-xl font-bold mt-1 text-white">
                  Admit {admittingReq.emergency_type || "Emergency Patient"}
                </h3>
              </div>
              <button
                className="text-xs font-semibold text-slate-400 hover:text-white"
                onClick={() => setAdmittingReq(null)}
              >
                ✕ Close
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div>
                <strong className="text-slate-200">Transport Unit:</strong>{" "}
                <span className="text-slate-400">
                  {admittingReq.driver?.display_name || "Assigned Ambulance"}
                  {admittingReq.driver?.vehicle_label ? ` (${admittingReq.driver.vehicle_label})` : ""}
                </span>
              </div>
              <div>
                <strong className="text-slate-200">Scene Location:</strong>{" "}
                <span className="text-slate-400">{formatLocation(admittingReq)}</span>
              </div>
              <div className="pt-1">
                <strong className="text-slate-200">Current ER Bed Capacity:</strong>{" "}
                <span className={`font-bold ${isFacilityFull ? "text-red-400" : "text-emerald-400"}`}>
                  {availableCapacity ?? "—"} beds available
                </span>{" "}
                <span className="text-slate-500 text-[11px]">
                  (will be decremented by 1 upon confirmation)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200">
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
                          : "border-slate-800 hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      {bay}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-slate-400">
                Or specify custom bed/room:
              </label>
              <input
                type="text"
                disabled={isFacilityFull}
                placeholder="e.g. Obstetric High Dependency Bay 2"
                value={customBay}
                onChange={(e) => setCustomBay(e.target.value)}
                className="input text-xs w-full py-2.5 px-3 rounded-lg bg-slate-950 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-slate-400">
                Admission Handover Notes (Optional):
              </label>
              <textarea
                rows={3}
                disabled={isFacilityFull}
                placeholder="Receiving team, initial field vitals confirmed, physician on-duty..."
                value={admitNotes}
                onChange={(e) => setAdmitNotes(e.target.value)}
                className="input text-xs w-full py-2 px-3 rounded-lg bg-slate-950 border-slate-700"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn py-2.5 px-4 text-xs font-semibold border border-slate-700 rounded-lg text-slate-300"
                onClick={() => setAdmittingReq(null)}
                disabled={busy === admittingReq.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn py-2.5 px-5 text-xs font-bold text-white rounded-lg shadow-md flex-1 text-center ${
                  isFacilityFull
                    ? "bg-gray-600 cursor-not-allowed"
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
