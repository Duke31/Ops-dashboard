"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AppRole,
  Driver,
  EmergencyRequest,
  Hospital,
  TransitionRule,
} from "@/lib/types";
import { allowedTargets, formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

function needsDriver(toStatus: string) {
  return toStatus.toLowerCase().includes("driver assigned");
}

function needsHospital(toStatus: string) {
  const s = toStatus.toLowerCase();
  return (
    s.includes("hospital") ||
    s.includes("match") ||
    s.includes("intake") ||
    s.includes("admit")
  );
}

function getHospitalCapacity(
  hospitalId: string | null | undefined,
  request: EmergencyRequest,
  hospitals: Pick<Hospital, "id" | "name" | "available_capacity">[],
): number | null {
  if (!hospitalId) return null;
  // Check embedded hospital in request first
  if (
    request.hospital &&
    request.hospital.id === hospitalId &&
    request.hospital.available_capacity != null
  ) {
    return request.hospital.available_capacity;
  }
  // Check hospitals list
  const found = hospitals.find((h) => h.id === hospitalId);
  if (found && found.available_capacity != null) {
    return found.available_capacity;
  }
  return null;
}

function getHospitalName(
  hospitalId: string | null | undefined,
  request: EmergencyRequest,
  hospitals: Pick<Hospital, "id" | "name" | "available_capacity">[],
): string {
  if (!hospitalId) return "Hospital";
  if (request.hospital && request.hospital.id === hospitalId && request.hospital.name) {
    return request.hospital.name;
  }
  const found = hospitals.find((h) => h.id === hospitalId);
  return found?.name || "Hospital";
}

export function RequestBoard({
  requests,
  rules,
  actorRole,
  hospitals = [],
  drivers = [],
  empty = "No active requests.",
}: {
  requests: EmergencyRequest[];
  rules: TransitionRule[];
  actorRole: AppRole;
  hospitals?: Pick<Hospital, "id" | "name" | "available_capacity">[];
  drivers?: Pick<Driver, "id" | "display_name" | "vehicle_label" | "hospital_id" | "active" | "duty_status">[];
  empty?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [driverDraft, setDriverDraft] = useState<Record<string, string>>({});
  const [hospitalDraft, setHospitalDraft] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // Real-time synchronization for zero-delay operations
  useEffect(() => {
    const channel = supabase
      .channel("ops-request-board-sync")
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
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, router]);

  async function ackTacticalAlert(requestId: string, replyMessage?: string) {
    try {
      let ackSucceeded = false;
      try {
        const { error: rpcErr } = await supabase.rpc("ack_driver_tactical_alert", {
          p_request_id: requestId,
          p_response_message: replyMessage || null,
        });
        if (!rpcErr) ackSucceeded = true;
      } catch {}

      const currentReq = requests.find((x) => x.id === requestId);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const replyNote = replyMessage ? `[DISPATCH RADIO ${timeStr}]: ${replyMessage}` : `[DISPATCH ACK ${timeStr}]: Acknowledged by Dispatcher`;
      const updatedNotes = currentReq?.notes ? `${currentReq.notes}\n${replyNote}` : replyNote;

      if (!ackSucceeded) {
        // Fallback to direct update if RPC is not present
        const { error: updateErr } = await supabase
          .from("emergency_requests")
          .update({
            tactical_alert_ack: true,
            dispatcher_response: replyMessage || "Acknowledged",
            dispatcher_response_at: replyMessage ? new Date().toISOString() : undefined,
            notes: updatedNotes,
          })
          .eq("id", requestId);
        if (updateErr) {
          try {
            await supabase.from("emergency_requests").update({ notes: updatedNotes }).eq("id", requestId);
          } catch {}
        }
      } else {
        try {
          await supabase.from("emergency_requests").update({ notes: updatedNotes }).eq("id", requestId);
        } catch {}
      }

      setOk(replyMessage ? `Radio response sent: "${replyMessage}"` : "Tactical alert acknowledged.");
      setActiveReplyId(null);
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Failed to acknowledge tactical alert.");
    }
  }

  async function quickRerouteHospital(requestId: string, newHospitalId: string) {
    try {
      const hospitalObj = hospitals.find((h) => h.id === newHospitalId);
      const hospitalName = hospitalObj?.name || "Alternate Facility";

      // 1. Assign new hospital via RPC or direct update
      try {
        const rpcRes = await supabase.rpc("assign_emergency_hospital", {
          p_request_id: requestId,
          p_hospital_id: newHospitalId,
        });
        if (rpcRes.error) throw rpcRes.error;
      } catch {
        await supabase.from("emergency_requests").update({
          hospital_id: newHospitalId,
        }).eq("id", requestId);
      }

      // 2. Transmit tactical confirmation to driver
      const replyMsg = `Hospital Divert Approved: Rerouted to ${hospitalName}`;
      await ackTacticalAlert(requestId, replyMsg);
      setOk(`Rerouted ambulance unit to ${hospitalName}. Radio confirmation transmitted.`);
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Failed to reroute hospital.");
    }
  }

  // Tactical radio alerts partition list
  const tacticalAlerts = useMemo(() => {
    return requests
      .map((r) => {
        let alertText = r.tactical_alert;
        let alertCode = r.tactical_alert_code;
        let alertAt = r.tactical_alert_at;
        let isAck = r.tactical_alert_ack;
        const dispResponse = r.dispatcher_response;

        // If not in tactical_alert column, extract from notes
        if (!alertText && r.notes) {
          const match = r.notes.match(/\[TACTICAL (?:RADIO|ALERT)[^\]]*\]:\s*([^\n\r]+)/i);
          if (match) {
            alertText = match[1]?.trim();
            alertAt = r.created_at;
            alertCode = alertText.toLowerCase().includes("divert") ? "DIVERT" : "ALERT";
            isAck = r.notes.includes("[DISPATCH");
          }
        }

        if (!alertText) return null;
        return {
          request: r,
          alertText,
          alertCode: alertCode || "ALERT",
          alertAt,
          isAck: Boolean(isAck),
          response: dispResponse,
        };
      })
      .filter(Boolean) as {
        request: EmergencyRequest;
        alertText: string;
        alertCode: string;
        alertAt?: string | null;
        isAck: boolean;
        response?: string | null;
      }[];
  }, [requests]);


  async function transition(
    request: EmergencyRequest,
    toStatus: string,
  ) {
    setError(null);
    setOk(null);

    const selectedDriver = driverDraft[request.id] || request.driver_id || "";
    if (needsDriver(toStatus) && !selectedDriver) {
      setError("Select an active driver before Driver assigned.");
      return;
    }

    const hospitalId =
      hospitalDraft[request.id] || request.hospital_id || "";
    if (needsHospital(toStatus) && !hospitalId) {
      setError("Select a hospital before confirming.");
      return;
    }

    // STRICT CAPACITY GUARD: Check capacity from both list and request object
    if (needsHospital(toStatus) && hospitalId) {
      const cap = getHospitalCapacity(hospitalId, request, hospitals);
      if (cap === 0) {
        const name = getHospitalName(hospitalId, request, hospitals);
        setError(
          `⛔ Cannot confirm or route to "${name}": Facility is at 0 available beds (Full / Diversion). Please select another hospital with open capacity.`,
        );
        return;
      }
    }

    setBusyId(request.id);
    try {
      if (needsHospital(toStatus) && hospitalId !== request.hospital_id) {
        const { error: hospErr } = await supabase.rpc(
          "assign_emergency_hospital",
          {
            p_request_id: request.id,
            p_hospital_id: hospitalId,
          },
        );
        if (hospErr) throw hospErr;
      }

      if (needsDriver(toStatus) && selectedDriver !== request.driver_id) {
        const { error: drvErr } = await supabase.rpc("assign_emergency_driver", {
          p_request_id: request.id,
          p_driver_id: selectedDriver,
        });
        if (drvErr) throw drvErr;

        try {
          const ch = supabase.channel(`driver_dispatch_realtime_${selectedDriver}`);
          await ch.subscribe();
          await ch.send({
            type: "broadcast",
            event: "emergency_assigned",
            payload: {
              request_id: request.id,
              patient_address: request.patient_address,
              emergency_type: request.emergency_type,
              priority: request.priority,
            },
          });
        } catch {}

        // Proactively fire background notification alert to driver unit
        fetch("/api/driver/dispatch-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId: selectedDriver,
            requestId: request.id,
            patientAddress: request.patient_address,
            emergencyType: request.emergency_type,
            priority: request.priority,
          }),
        }).catch(() => {});
      }

      const { error: rpcErr } = await supabase.rpc(
        "transition_emergency_state",
        {
          request_id: request.id,
          new_state: toStatus,
          actor_role: actorRole,
        },
      );
      if (rpcErr) throw rpcErr;
      setOk(`Moved to “${toStatus}”.`);
      router.refresh();
    } catch (e: unknown) {
      const msg = rpcMessage(e) || "Transition failed.";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  }

  if (!requests.length) {
    return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  }

  return (
    <>
      {/* DEDICATED TACTICAL RADIO & REROUTE ALERT PARTITION */}
      {tacticalAlerts.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h3 className="font-extrabold text-sm tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                <span>📻</span>
                <span>Tactical Radio & Situational Alerts Channel</span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                  {tacticalAlerts.filter((a) => !a.isAck).length} PENDING ACTION
                </span>
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Live telemetry & tactical radio communications between ambulance units and Dispatch
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {tacticalAlerts.map((item) => {
              const req = item.request;
              const isDivert =
                item.alertText.toLowerCase().includes("divert") || item.alertCode === "DIVERT";
              return (
                <div
                  key={req.id}
                  className={`rounded-lg border p-3.5 transition-all ${
                    item.isAck
                      ? "bg-slate-800/60 border-slate-700 text-slate-300"
                      : "bg-amber-950/70 border-amber-500/60 text-amber-100 shadow-md ring-1 ring-amber-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚑</span>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span>{req.driver?.display_name || "Ambulance Unit"}</span>
                          {req.driver?.vehicle_label && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-700 text-[10px] text-slate-300 font-mono">
                              {req.driver.vehicle_label}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Location: {formatLocation(req)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider ${
                          isDivert
                            ? "bg-red-600 text-white animate-pulse"
                            : item.isAck
                            ? "bg-slate-700 text-slate-300"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {isDivert ? "🚨 HOSPITAL DIVERT / REROUTE" : item.alertCode}
                      </span>
                      {item.alertAt && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {timeSince(item.alertAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 rounded bg-black/50 p-2 font-mono text-xs border border-white/10 flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">DRIVER RADIO:</span>
                    <span className="text-white font-medium">&ldquo;{item.alertText}&rdquo;</span>
                  </div>

                  {item.response && (
                    <div className="mt-2 text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-500/30 rounded p-1.5 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Dispatcher Reply: &ldquo;{item.response}&rdquo;</span>
                    </div>
                  )}

                  {/* Dispatcher Actions */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!item.isAck ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              ackTacticalAlert(
                                req.id,
                                isDivert
                                  ? "Hospital Divert Approved - Reroute Authorized"
                                  : "Copy that - Dispatch standing by",
                              )
                            }
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all flex items-center gap-1"
                          >
                            <span>✓</span>
                            <span>{isDivert ? "Approve Divert" : "Acknowledge"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReplyId(activeReplyId === req.id ? null : req.id)
                            }
                            className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition-all"
                          >
                            Radio Reply ▾
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <span>✓</span> Acknowledged & Addressed
                        </span>
                      )}
                    </div>

                    {/* Quick Reroute Hospital Switcher */}
                    {isDivert && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Reroute To:</span>
                        <select
                          className="text-[11px] py-0.5 px-2 bg-slate-900 border border-amber-500/50 text-white rounded font-medium focus:ring-1 focus:ring-amber-400"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              quickRerouteHospital(req.id, e.target.value);
                            }
                          }}
                        >
                          <option value="" disabled>
                            Select Alternate Hospital ({req.hospital?.name || "Current"} is diverted)
                          </option>
                          {hospitals
                            .filter((h) => h.id !== req.hospital_id)
                            .map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name} ({h.available_capacity ?? 0} beds)
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Canned Radio Options */}
                  {activeReplyId === req.id && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          ackTacticalAlert(
                            req.id,
                            "Hospital Divert Approved - Proceed to alternate facility",
                          )
                        }
                        className="text-left text-xs bg-slate-800 hover:bg-emerald-600 text-white p-1.5 rounded transition-all"
                      >
                        🏥 Hospital Divert Approved
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          ackTacticalAlert(
                            req.id,
                            "Police Escort Dispatched to your coordinates",
                          )
                        }
                        className="text-left text-xs bg-slate-800 hover:bg-emerald-600 text-white p-1.5 rounded transition-all"
                      >
                        🚓 Police Escort Dispatched
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          ackTacticalAlert(req.id, "ER Trauma Bay Ready - Expedite arrival")
                        }
                        className="text-left text-xs bg-slate-800 hover:bg-emerald-600 text-white p-1.5 rounded transition-all"
                      >
                        ⚠️ ER Trauma Bay Ready
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          ackTacticalAlert(
                            req.id,
                            "Traffic patrol notified - alternate corridor open",
                          )
                        }
                        className="text-left text-xs bg-slate-800 hover:bg-emerald-600 text-white p-1.5 rounded transition-all"
                      >
                        🚦 Traffic Cleared Ahead
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Patient location</th>
              <th>Type</th>
              <th>Status</th>
              <th>Opened</th>
              <th>Hospital</th>
              <th>Driver</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const targets = allowedTargets(rules, r.status, actorRole);
              const showHospital = targets.some(needsHospital);
              const showDriver = targets.some(needsDriver) && !r.driver_id;
              const selectedDriver = driverDraft[r.id] ?? r.driver_id ?? "";
              const selectedHospital =
                hospitalDraft[r.id] ?? r.hospital_id ?? "";

              const effectiveCap = getHospitalCapacity(
                selectedHospital,
                r,
                hospitals,
              );
              const isSelectedHospitalFull = effectiveCap === 0;

              return (
                <tr key={r.id}>
                  <td className="max-w-[260px]">
                    <div className="font-semibold text-sm leading-snug text-slate-900 dark:text-slate-100 flex items-start gap-1">
                      <span className="text-red-600 mt-0.5">📍</span>
                      <span>{formatLocation(r)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {r.contact_phone && (
                        <a
                          href={`tel:${r.contact_phone}`}
                          className="font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1 transition-all"
                          title="Call patient"
                        >
                          <span>📞</span>
                          <span>{r.contact_phone}</span>
                        </a>
                      )}
                      {r.patient_age_band && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-raised,#f3f4f6)] text-[var(--muted)] border border-[var(--border,#e5e7eb)] font-medium">
                          {r.patient_age_band === "unknown" ? "Age: ?" : `${r.patient_age_band} yrs`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[240px]">
                    <div className="font-semibold text-sm">{r.emergency_type || "—"}</div>
                    {r.notes && (
                      <div className="mt-1 text-[11px] leading-tight text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/20 rounded p-1.5">
                        <span className="font-bold uppercase tracking-wider text-[9px] block opacity-75 mb-0.5">
                          Triage & Medical ID:
                        </span>
                        <span className="line-clamp-3 hover:line-clamp-none transition-all">{r.notes}</span>
                      </div>
                    )}
                    {r.tactical_alert && (
                      <div className={`mt-2 p-2 rounded-lg border text-[11px] ${
                        r.tactical_alert_ack
                          ? "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          : "bg-amber-500/15 dark:bg-amber-950/50 border-amber-500/40 text-amber-900 dark:text-amber-200 animate-pulse"
                      }`}>
                        <div className="flex items-center justify-between gap-1 font-bold text-[10px] uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <span>📻 TACTICAL RADIO</span>
                            {!r.tactical_alert_ack && (
                              <span className="px-1 py-0.2 rounded bg-red-600 text-white text-[9px]">NEW</span>
                            )}
                          </span>
                          {r.tactical_alert_at && (
                            <span className="font-normal opacity-75">{timeSince(r.tactical_alert_at)}</span>
                          )}
                        </div>
                        <div className="mt-1 font-semibold text-xs leading-snug">
                          {r.tactical_alert}
                        </div>
                        {r.dispatcher_response && (
                          <div className="mt-1.5 pt-1.5 border-t border-current/20 text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                            ↳ Dispatcher: &ldquo;{r.dispatcher_response}&rdquo;
                          </div>
                        )}
                        {!r.tactical_alert_ack && (
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => ackTacticalAlert(r.id)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-sm transition-all"
                            >
                              ✓ Acknowledge
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveReplyId(activeReplyId === r.id ? null : r.id)}
                              className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium text-[10px]"
                            >
                              Radio Reply ▾
                            </button>
                          </div>
                        )}
                        {activeReplyId === r.id && !r.tactical_alert_ack && (
                          <div className="mt-2 pt-2 border-t border-current/20 flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase opacity-80">Quick Radio Responses:</span>
                            <div className="grid grid-cols-1 gap-1">
                              <button
                                type="button"
                                onClick={() => ackTacticalAlert(r.id, "Police Escort Dispatched")}
                                className="text-left text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded"
                              >
                                🚓 Police Escort Dispatched
                              </button>
                              <button
                                type="button"
                                onClick={() => ackTacticalAlert(r.id, "Hospital Divert Approved")}
                                className="text-left text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded"
                              >
                                🏥 Hospital Divert Approved
                              </button>
                              <button
                                type="button"
                                onClick={() => ackTacticalAlert(r.id, "ER Trauma Team Standing By")}
                                className="text-left text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded"
                              >
                                ⚠️ ER Trauma Team Standing By
                              </button>
                              <button
                                type="button"
                                onClick={() => ackTacticalAlert(r.id, "Copy that, stay safe")}
                                className="text-left text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded"
                              >
                                🆗 Copy that, stay safe
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap text-[var(--muted)]">
                    {timeSince(r.created_at)}
                  </td>
                  <td>
                    {r.hospital?.name ? (
                      <div>
                        <div className="font-medium text-xs text-slate-900 dark:text-slate-100">
                          {r.hospital.name}
                        </div>
                        <div className="mt-0.5">
                          {r.hospital.available_capacity != null ? (
                            r.hospital.available_capacity === 0 ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                                ⛔ 0 Beds (Full)
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                {r.hospital.available_capacity} Beds Available
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-[12px]">
                    {r.driver?.display_name ? (
                      <>
                        <div className="font-medium flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              r.driver.duty_status === "off_duty" || r.driver.active === false
                                ? "bg-slate-400"
                                : "bg-emerald-500 shadow-sm"
                            }`}
                            title={r.driver.duty_status === "off_duty" ? "Off Duty" : "On Duty"}
                          />
                          <span>{r.driver.display_name}</span>
                        </div>
                        <div className="text-[var(--muted)] text-[11px]">
                          {r.driver.vehicle_label}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {showHospital && (
                        <select
                          className={`select ${
                            isSelectedHospitalFull
                              ? "border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold"
                              : ""
                          }`}
                          value={selectedHospital}
                          onChange={async (e) => {
                            const value = e.target.value;
                            if (!value) return;

                            // STRICT CAPACITY GUARD: Cannot select hospital with 0 beds
                            const cap = getHospitalCapacity(value, r, hospitals);
                            if (cap === 0) {
                              const name = getHospitalName(value, r, hospitals);
                              setError(
                                `⛔ Cannot route to "${name}": Facility is at 0 available beds (Full / Diversion). Please select another hospital.`,
                              );
                              return;
                            }

                            setHospitalDraft((h) => ({
                              ...h,
                              [r.id]: value,
                            }));

                            setError(null);
                            const { error: err } = await supabase.rpc(
                              "assign_emergency_hospital",
                              {
                                p_request_id: r.id,
                                p_hospital_id: value,
                              },
                            );
                            if (err) setError(rpcMessage(err));
                            else router.refresh();
                          }}
                        >
                          <option value="">Select hospital</option>
                          {hospitals.map((h) => {
                            const cap = getHospitalCapacity(h.id, r, hospitals);
                            const isFull = cap === 0;
                            return (
                              <option
                                key={h.id}
                                value={h.id}
                                disabled={isFull}
                              >
                                {h.name}{" "}
                                {cap != null
                                  ? isFull
                                    ? "⛔ (0 beds - FULL)"
                                    : `(${cap} beds)`
                                  : ""}
                              </option>
                            );
                          })}
                        </select>
                      )}

                      {isSelectedHospitalFull && showHospital && (
                        <div className="p-2 rounded bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-900 text-[11px] text-red-800 dark:text-red-300 font-semibold">
                          ⛔ Assigned facility has 0 available beds. Select another hospital above to proceed.
                        </div>
                      )}

                      {showDriver && (
                        <select
                          className="select"
                          value={selectedDriver}
                          onChange={async (e) => {
                            const value = e.target.value;
                            setDriverDraft((d) => ({ ...d, [r.id]: value }));
                            if (!value) return;
                            setError(null);
                            const { error: err } = await supabase.rpc(
                              "assign_emergency_driver",
                              {
                                p_request_id: r.id,
                                p_driver_id: value,
                              },
                            );
                            if (err) {
                              setError(rpcMessage(err));
                            } else {
                              try {
                                const ch = supabase.channel(`driver_dispatch_realtime_${value}`);
                                await ch.subscribe();
                                await ch.send({
                                  type: "broadcast",
                                  event: "emergency_assigned",
                                  payload: {
                                    request_id: r.id,
                                    patient_address: r.patient_address,
                                    emergency_type: r.emergency_type,
                                    priority: r.priority,
                                  },
                                });
                              } catch {}

                              fetch("/api/driver/dispatch-notify", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  driverId: value,
                                  requestId: r.id,
                                  patientAddress: r.patient_address,
                                  emergencyType: r.emergency_type,
                                  priority: r.priority,
                                }),
                              }).catch(() => {});

                              setOk("Driver assigned & dispatch alert sent to ambulance unit.");
                              router.refresh();
                            }
                          }}
                        >
                          <option value="">Select driver</option>
                          {drivers.map((d) => {
                            const isOffDuty = d.duty_status === "off_duty" || d.active === false;
                            return (
                              <option key={d.id} value={d.id}>
                                {isOffDuty ? "⚪ [OFF DUTY] " : "🟢 [ON DUTY] "}
                                {d.display_name || "Driver"}
                                {d.vehicle_label ? ` · ${d.vehicle_label}` : ""}
                              </option>
                            );
                          })}
                        </select>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {targets.length === 0 && (
                          <span className="text-[12px] text-[var(--muted)]">
                            No legal transitions
                          </span>
                        )}
                        {targets.map((to) => {
                          const isHospAction = needsHospital(to);
                          const isBlocked = isHospAction && isSelectedHospitalFull;

                          return (
                            <button
                              key={to}
                              className={`btn ${
                                isBlocked
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-300 dark:border-red-800 cursor-not-allowed opacity-60 font-bold"
                                  : "btn-primary"
                              }`}
                              disabled={busyId === r.id || isBlocked}
                              onClick={() => transition(r, to)}
                              title={
                                isBlocked
                                  ? "Hospital has 0 beds available. Choose another facility."
                                  : ""
                              }
                            >
                              {isBlocked ? "⛔ Full (0 Beds)" : to}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Toast
        message={error}
        kind="error"
        onClose={() => setError(null)}
      />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </>
  );
}
