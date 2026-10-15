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
import {
  detectCluster,
  extractSbarData,
  REGION_CLUSTERS,
  CLINICAL_SPECIALTIES,
  type SbarHandoverData,
} from "@/lib/regionClusters";
import {
  Stethoscope,
  Heart,
  Baby,
  Activity,
  AlertCircle,
  Clock,
  Phone,
  Bed,
  CheckCircle,
  ShieldAlert,
  Flame,
  FileText,
  Eye,
} from "lucide-react";

const PRESET_BAYS = [
  "Obstetric Delivery Suite 1",
  "Obstetric C-Section Theater",
  "Trauma Bay 1 (Resuscitation)",
  "Trauma Bay 2",
  "Critical Care / ICU-1",
  "Pediatric / Neonatal Bay",
  "Acute Observation 1",
  "General Triage Bed",
];

export function HospitalCards({
  requests,
  historyRequests = [],
  rules,
  availableCapacity = null,
  readOnly = false,
}: {
  requests: EmergencyRequest[];
  historyRequests?: EmergencyRequest[];
  rules: TransitionRule[];
  availableCapacity?: number | null;
  readOnly?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { highlightedRequestId } = useDeskAlerts();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // SBAR Clinical Handover Modal State
  const [activeSbar, setActiveSbar] = useState<{
    request: EmergencyRequest;
    data: SbarHandoverData;
  } | null>(null);

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
  const [selectedBay, setSelectedBay] = useState<string>("Obstetric Delivery Suite 1");
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
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                Incoming Clinical Transfers ({requests.length})
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Pre-Arrival SBAR Enabled
              </span>
            </div>
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
                const targets = readOnly
                  ? []
                  : allowedTargets(rules, r.status, "hospital").filter(
                      (t) => t !== "Completed",
                    );
                const showAdmitButton =
                  !readOnly &&
                  (r.status === "Arrived / intake" || r.status === "En route to hospital");
                const isHighlighted = highlightedRequestId === r.id;
                const clusterKey = detectCluster(r);
                const clusterInfo = REGION_CLUSTERS[clusterKey];
                const sbarData = extractSbarData(r);
                const isObstetric = (r.emergency_type || "").toLowerCase().includes("obstetric") || (r.emergency_type || "").toLowerCase().includes("matern");

                return (
                  <article
                    key={r.id}
                    className={`card p-4 space-y-3 border-l-4 ${
                      isObstetric ? "border-l-purple-600" : "border-l-blue-600"
                    } bg-[var(--surface)] shadow-sm transition-all duration-500 ${
                      isHighlighted
                        ? "ring-2 ring-blue-500 bg-blue-500/15 dark:bg-blue-950/60 animate-pulse"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-bold text-base flex flex-wrap items-center gap-2">
                          <span>{r.emergency_type || "Emergency Patient"}</span>
                          {r.priority && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                Number(r.priority) === 1
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                              }`}
                            >
                              Priority {r.priority}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {clusterInfo.badge}
                          </span>
                          {isObstetric && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              ⚡ Fast-Track Maternal Transit
                            </span>
                          )}
                          {(r.stage === "stage_a" || r.origin === "phc_referral" || (r.notes || "").includes("PHC_TRANSFER") || (r.patient_address || "").includes("PHC Transfer")) && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
                              🏥 STAGE A: PHC TRANSFER
                            </span>
                          )}
                        </div>

                        {/* Pre-referral medications highlight */}
                        {((r.notes || "").includes("Magnesium Sulphate") || (r.notes || "").includes("Oxytocin")) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(r.notes || "").includes("Magnesium Sulphate") && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                💊 MgSO4 Loading Dose Given at PHC
                              </span>
                            )}
                            {(r.notes || "").includes("Oxytocin") && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                                💊 Oxytocin Given at PHC
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-[var(--muted)]">
                          {formatLocation(r)} · Reported {timeSince(r.created_at)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          {(() => {
                            const age = resolvePatientAgeBand(r);
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-[var(--surface-raised,#f3f4f6)] text-[var(--foreground)] border border-[var(--border,#e5e7eb)]">
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
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <span>📞</span>
                              <span>Patient: {r.contact_phone}</span>
                            </a>
                          )}

                          {/* SBAR Preview Launcher */}
                          <button
                            type="button"
                            onClick={() => setActiveSbar({ request: r, data: sbarData })}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View SBAR Handover</span>
                          </button>
                        </div>

                        {/* SBAR Clinical Quick Snapshot */}
                        <div className="mt-2 rounded-md p-2.5 text-xs bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-1">
                          <div className="font-bold text-[11px] text-[var(--foreground)] flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Clinical SBAR Summary:</span>
                            </span>
                            <span className="text-[10px] text-[var(--muted)]">
                              Escalation Tier {sbarData.escalationTier}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--foreground)] leading-relaxed font-mono">
                            <strong className="text-blue-600 dark:text-blue-400">S:</strong> {sbarData.situation}
                          </p>
                          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                            <strong className="text-emerald-600 dark:text-emerald-400">R:</strong> {sbarData.recommendation}
                          </p>
                        </div>

                        {r.driver?.display_name && (
                          <div className="text-xs mt-2 text-[var(--muted)] flex items-center gap-2">
                            <span>🚑</span>
                            <span>
                              Transport Unit:{" "}
                              <strong className="text-[var(--foreground)]">
                                {r.driver.display_name}
                              </strong>{" "}
                              {r.driver.vehicle_label ? `(${r.driver.vehicle_label})` : ""}
                            </span>
                            {r.driver.phone && (
                              <a
                                href={`tel:${r.driver.phone}`}
                                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" /> Call Driver
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <StatusBadge status={r.status} />
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-[var(--border,#e5e7eb)] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {targets.map((to) => {
                          const isDecline = to.toLowerCase().includes("declin");
                          const isDisabled = busy === r.id || (!isDecline && isFacilityFull);
                          return (
                            <button
                              key={to}
                              className={`btn text-xs font-semibold ${
                                isDecline
                                  ? "btn-ghost text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800"
                                  : "btn-primary"
                              }`}
                              disabled={isDisabled}
                              onClick={() => go(r.id, to)}
                            >
                              {busy === r.id ? "Updating…" : to}
                            </button>
                          );
                        })}

                        {showAdmitButton && (
                          <button
                            type="button"
                            className="btn btn-primary text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                            disabled={busy === r.id || isFacilityFull}
                            onClick={() => {
                              setAdmittingReq(r);
                              if (isObstetric) {
                                setSelectedBay("Obstetric Delivery Suite 1");
                              } else {
                                setSelectedBay("Trauma Bay 1 (Resuscitation)");
                              }
                            }}
                          >
                            <Bed className="w-3.5 h-3.5" />
                            <span>Admit to Bay / Ward…</span>
                          </button>
                        )}
                      </div>

                      {readOnly && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Supervisor Monitor · Triage Inspection</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* SBAR Detailed Clinical Handover Modal */}
      {activeSbar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="card max-w-2xl w-full p-6 space-y-5 bg-[var(--surface,#ffffff)] border border-[var(--border,#e2e8f0)] rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <FileText className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Pre-Arrival SBAR Transfer Note
                  </h3>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Standardized Pre-Hospital to Emergency Receiving Facility Handover
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSbar(null)}
                className="btn btn-ghost px-2.5 py-1 text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* SBAR 4-Quadrant Display */}
            <div className="space-y-3 text-xs">
              {/* Situation */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <div className="font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider text-[11px] mb-1">
                  S — Situation (Primary Emergency)
                </div>
                <p className="text-[var(--foreground)] leading-relaxed">
                  {activeSbar.data.situation}
                </p>
              </div>

              {/* Background */}
              <div className="p-3 rounded-lg bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)]">
                <div className="font-bold text-[var(--muted)] uppercase tracking-wider text-[11px] mb-1">
                  B — Background & Patient Context
                </div>
                <p className="text-[var(--foreground)] leading-relaxed">
                  {activeSbar.data.background}
                </p>
                <div className="mt-2 text-[11px] text-[var(--muted)] flex flex-wrap gap-2">
                  <span>Age Band: <strong>{resolvePatientAgeBand(activeSbar.request)}</strong></span>
                  <span>·</span>
                  <span>Origin: <strong>{activeSbar.request.origin || "Mobile App Call"}</strong></span>
                  <span>·</span>
                  <span>Location: <strong>{formatLocation(activeSbar.request)}</strong></span>
                </div>
              </div>

              {/* Assessment */}
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider text-[11px] mb-1">
                  A — Assessment & En Route Interventions
                </div>
                <p className="text-[var(--foreground)] leading-relaxed">
                  {activeSbar.data.assessment}
                </p>
                {activeSbar.data.preReferralMedications.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-900/60">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Pre-Referral Medications Given:
                    </span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-emerald-900 dark:text-emerald-200">
                      {activeSbar.data.preReferralMedications.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendation */}
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                <div className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[11px] mb-1">
                  R — Recommendation & Hospital Prep
                </div>
                <p className="text-[var(--foreground)] leading-relaxed">
                  {activeSbar.data.recommendation}
                </p>
              </div>
            </div>

            {/* Quick Handover Actions */}
            <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[var(--muted)]">
                Assigned Unit: <strong>{activeSbar.request.driver?.display_name || "En Route"}</strong>
              </div>
              <div className="flex items-center gap-2">
                {activeSbar.request.driver?.phone && (
                  <a
                    href={`tel:${activeSbar.request.driver.phone}`}
                    className="btn btn-ghost text-xs px-3 py-1.5 border border-blue-300 text-blue-700 dark:text-blue-300"
                  >
                    📞 Call Paramedic
                  </a>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const r = activeSbar.request;
                      setActiveSbar(null);
                      setAdmittingReq(r);
                    }}
                    className="btn btn-primary text-xs px-4 py-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Confirm Bay Admission →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bay Admission Modal */}
      {admittingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="card max-w-lg w-full p-6 space-y-5 bg-[var(--surface,#ffffff)] border border-[var(--border,#e2e8f0)] rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border,#e5e7eb)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Confirm Emergency Admission & Bay Intake
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Assign arriving patient to an active clinical bed or trauma bay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdmittingReq(null)}
                className="btn btn-ghost px-2.5 py-1 text-xs"
              >
                ✕
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
                <strong className="text-[var(--foreground)]">Current Live Beds:</strong>{" "}
                <span
                  className={`font-bold ${
                    isFacilityFull ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {availableCapacity ?? "—"} beds available
                </span>{" "}
                <span className="text-[var(--muted)] text-[11px]">
                  (will be decremented by 1 upon confirmation)
                </span>
              </div>
            </div>

            {/* Select Receiving Bed / Bay */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                Select Receiving Bed / Clinical Bay:
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
                placeholder="e.g. Delivery Suite 2 / Ward 4B"
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
                placeholder="Assigned obstetrician/surgeon, initial vitals taken at triage bay, or special instructions..."
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
      {ok && <Toast message={ok} kind="ok" onClose={() => setOk(null)} />}
    </>
  );
}
