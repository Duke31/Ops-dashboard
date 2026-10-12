"use client";
import Link from "next/link";

import { useEffect, useMemo, useState } from "react";
import type {
  AppRole,
  Driver,
  EmergencyRequest,
  Hospital,
  TransitionRule,
} from "@/lib/types";
import { allowedTargets, formatLocation, resolvePatientAgeBand } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";
import { parsePatientReview, parsePatientCancellation, getCleanMedicalNotes } from "@/lib/patientReview";
import { useDeskAlerts } from "@/components/alerts/DeskAlertProvider";
import {
  REGION_CLUSTERS,
  RegionClusterId,
  resolveItemCluster,
  computeRequestSLA
} from "@/lib/regionClusters";
import {
  parseSBARHandover,
  formatSBARSummary,
  ClinicalSpecialty,
  SBARHandover
} from "@/lib/clinicalProtocols";

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
  if (
    request.hospital &&
    request.hospital.id === hospitalId &&
    request.hospital.available_capacity != null
  ) {
    return request.hospital.available_capacity;
  }
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
  const { highlightedRequestId } = useDeskAlerts();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [driverDraft, setDriverDraft] = useState<Record<string, string>>({});
  const [hospitalDraft, setHospitalDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // Filter States
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<RegionClusterId>("all");
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string>("all");

  // SBAR Modal Inspection state
  const [inspectSbarModal, setInspectSbarModal] = useState<{
    request: EmergencyRequest;
    sbar: SBARHandover;
  } | null>(null);

  const [liveAlerts, setLiveAlerts] = useState<
    Record<
      string,
      {
        requestId: string;
        driverName: string;
        vehicleLabel?: string;
        alertCode: string;
        alertText: string;
        alertAt: string;
        isAck: boolean;
      }
    >
  >({});

  function playAlertChime() {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {}
  }

  // Real-time synchronization
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
      .on("broadcast", { event: "driver_tactical_alert" }, (payload: { payload?: Record<string, unknown> }) => {
        const data = payload?.payload;
        if (data?.request_id && typeof data.request_id === "string") {
          playAlertChime();
          const reqId = data.request_id;
          setLiveAlerts((prev) => ({
            ...prev,
            [reqId]: {
              requestId: reqId,
              driverName: (data.driver_name as string) || "Ambulance Unit",
              vehicleLabel: (data.vehicle_label as string) || undefined,
              alertCode: (data.alert_code as string) || "EMERGENCY",
              alertText: (data.alert_message as string) || "URGENT DRIVER ALERT",
              alertAt: (data.created_at as string) || new Date().toISOString(),
              isAck: false,
            },
          }));
          router.refresh();
        }
      })
      .subscribe();

    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, router]);

  async function ackTacticalAlert(requestId: string, replyMessage?: string) {
    try {
      setLiveAlerts((prev) => {
        if (!prev[requestId]) return prev;
        return {
          ...prev,
          [requestId]: { ...prev[requestId], isAck: true },
        };
      });

      let ackSucceeded = false;
      try {
        const { error: rpcErr } = await supabase.rpc("ack_driver_tactical_alert", {
          p_request_id: requestId,
          p_response_message: replyMessage || null,
        });
        if (!rpcErr) ackSucceeded = true;
      } catch {}

      const currentReq = requests.find((x) => x.id === requestId);
      if (currentReq?.driver_id) {
        try {
          const ch = supabase.channel(`driver_dispatch_realtime_${currentReq.driver_id}`);
          await ch.subscribe();
          await ch.send({
            type: "broadcast",
            event: "tactical_alert_ack",
            payload: {
              request_id: requestId,
              response: replyMessage || "Acknowledged by Dispatch",
            },
          });
        } catch {}
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const replyNote = replyMessage ? `[DISPATCH RADIO ${timeStr}]: ${replyMessage}` : `[DISPATCH ACK ${timeStr}]: Acknowledged by Dispatcher`;
      const updatedNotes = currentReq?.notes ? `${currentReq.notes}\n${replyNote}` : replyNote;

      if (!ackSucceeded) {
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

      try {
        await supabase.rpc("assign_emergency_hospital", {
          p_request_id: requestId,
          p_hospital_id: newHospitalId,
        });
      } catch {
        await supabase
          .from("emergency_requests")
          .update({ hospital_id: newHospitalId })
          .eq("id", requestId);
      }

      setHospitalDraft((prev) => ({ ...prev, [requestId]: newHospitalId }));

      const ch = supabase.channel(`request-status:${requestId}`);
      await ch.subscribe();
      await ch.send({
        type: "broadcast",
        event: "hospital_assigned",
        payload: {
          hospital_id: newHospitalId,
          hospital_name: hospitalName,
          rerouted: true,
        },
      });

      const currentReq = requests.find((x) => x.id === requestId);
      if (currentReq?.driver_id) {
        const chDrv = supabase.channel(`driver_dispatch_realtime_${currentReq.driver_id}`);
        await chDrv.subscribe();
        await chDrv.send({
          type: "broadcast",
          event: "hospital_rerouted",
          payload: {
            request_id: requestId,
            hospital_id: newHospitalId,
            hospital_name: hospitalName,
          },
        });
      }

      await ackTacticalAlert(
        requestId,
        `Divert Approved: Rerouted to ${hospitalName} (${hospitalObj?.available_capacity ?? 0} beds available)`,
      );

      setOk(`Patient safely rerouted to ${hospitalName}.`);
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Failed to reroute hospital.");
    }
  }

  const tacticalAlerts = useMemo(() => {
    const list: {
      request: EmergencyRequest;
      alertText: string;
      alertCode: string;
      alertAt: string;
      isAck: boolean;
      driverName: string;
    }[] = [];

    for (const r of requests) {
      const live = liveAlerts[r.id];
      if (live) {
        list.push({
          request: r,
          alertText: live.alertText,
          alertCode: live.alertCode,
          alertAt: live.alertAt,
          isAck: live.isAck,
          driverName: live.driverName,
        });
      } else if (r.tactical_alert) {
        list.push({
          request: r,
          alertText: r.tactical_alert,
          alertCode: "ALERT",
          alertAt: r.tactical_alert_at || r.created_at,
          isAck: !!r.tactical_alert_ack,
          driverName: r.driver?.display_name || "Ambulance Unit",
        });
      }
    }

    return list.sort((a, b) => (a.isAck === b.isAck ? 0 : a.isAck ? 1 : -1));
  }, [requests, liveAlerts]);

  // Regional & Specialty Filtering
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Cluster filter
      if (selectedClusterFilter !== "all") {
        const itemCluster = resolveItemCluster(r);
        if (itemCluster !== selectedClusterFilter) return false;
      }
      // Specialty filter
      if (selectedSpecialtyFilter !== "all") {
        const sbar = parseSBARHandover(r.notes);
        const reqSpecialty = sbar?.specialty || (r.emergency_type ? r.emergency_type.toLowerCase() : "general");
        if (!reqSpecialty.includes(selectedSpecialtyFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [requests, selectedClusterFilter, selectedSpecialtyFilter]);

  async function transition(request: EmergencyRequest, toStatus: string) {
    setBusyId(request.id);
    setError(null);
    setOk(null);

    const selectedDriver = driverDraft[request.id] ?? request.driver_id;
    const selectedHospital = hospitalDraft[request.id] ?? request.hospital_id;

    if (needsHospital(toStatus) && !selectedHospital) {
      setError("Please select a hospital before moving to this state.");
      setBusyId(null);
      return;
    }

    if (needsDriver(toStatus) && !selectedDriver) {
      setError("Please select a driver before moving to this state.");
      setBusyId(null);
      return;
    }

    try {
      if (needsHospital(toStatus) && selectedHospital !== request.hospital_id) {
        const { error: hospErr } = await supabase.rpc(
          "assign_emergency_hospital",
          {
            p_request_id: request.id,
            p_hospital_id: selectedHospital,
          },
        );
        if (hospErr) throw hospErr;

        try {
          const hospObj = hospitals.find((h) => h.id === selectedHospital);
          const chHosp = supabase.channel(`request-status:${request.id}`);
          await chHosp.subscribe();
          await chHosp.send({
            type: "broadcast",
            event: "hospital_assigned",
            payload: {
              hospital_id: selectedHospital,
              hospital_name: hospObj?.name || "Assigned Facility",
              status: toStatus,
            },
          });
        } catch {}
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

  return (
    <>
      {/* MULTI-CLUSTER & CLINICAL SPECIALTY FILTER BAR */}
      <div className="mb-4 rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Cluster Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <span>🌐</span> Cluster:
          </span>
          <button
            type="button"
            onClick={() => setSelectedClusterFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              selectedClusterFilter === "all"
                ? "bg-slate-700 text-white shadow-sm ring-1 ring-slate-500"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            All Clusters ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedClusterFilter("ibadan_private")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedClusterFilter === "ibadan_private"
                ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400"
                : "bg-slate-800/60 text-emerald-400 hover:bg-slate-800"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            Ibadan Private
          </button>
          <button
            type="button"
            onClick={() => setSelectedClusterFilter("osun_pilot")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedClusterFilter === "osun_pilot"
                ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400"
                : "bg-slate-800/60 text-amber-400 hover:bg-slate-800"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            Osun Pilot (OSEMSAS)
          </button>
          <button
            type="button"
            onClick={() => setSelectedClusterFilter("lagos_metro")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedClusterFilter === "lagos_metro"
                ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
                : "bg-slate-800/60 text-blue-400 hover:bg-slate-800"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-blue-400"></span>
            Lagos Metro
          </button>
        </div>

        {/* Clinical Specialty Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <span>🩺</span> Specialty:
          </span>
          <select
            className="select text-xs py-1 px-2.5 bg-slate-950 border border-slate-700 text-slate-200"
            value={selectedSpecialtyFilter}
            onChange={(e) => setSelectedSpecialtyFilter(e.target.value)}
          >
            <option value="all">All Specialties</option>
            <option value="obstetric">Obstetric / Maternal ★</option>
            <option value="trauma">Trauma / RTC</option>
            <option value="cardiac">Cardiovascular / Stroke</option>
            <option value="pediatric">Pediatric</option>
          </select>
        </div>
      </div>

      {/* PATIENT REVIEWS & QA BANNER */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">⭐</span>
          <span className="font-bold text-[var(--foreground)]">Patient Remarks & Quality of Service Audit</span>
          <span className="text-[var(--muted)] hidden sm:inline">• Read feedback & remarks submitted directly by patients</span>
        </div>
        <Link
          href={`/${actorRole}/reviews`}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 px-3 py-1 font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white dark:hover:text-slate-950 transition-all text-xs"
        >
          <span>Audit Patient Remarks</span>
          <span>→</span>
        </Link>
      </div>

      {/* DEDICATED TACTICAL RADIO & REROUTE ALERT CHANNEL */}
      {tacticalAlerts.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-amber-500/50 bg-amber-50/50 dark:bg-gradient-to-r dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 p-4 shadow-sm dark:shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h3 className="font-extrabold text-sm tracking-wider text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
                <span>📻</span>
                <span>Tactical Radio & Situational Alerts Channel</span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                  {tacticalAlerts.filter((a) => !a.isAck).length} PENDING ACTION
                </span>
              </h3>
            </div>
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
                      ? "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)]"
                      : "bg-amber-500/10 dark:bg-amber-950/70 border-amber-500/60 text-[var(--foreground)] shadow-md ring-1 ring-amber-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🚑</span>
                      <div>
                        <div className="font-bold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                          <span>{req.driver?.display_name || "Ambulance Unit"}</span>
                          {req.driver?.vehicle_label && (
                            <span className="px-1.5 py-0.2 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[10px] text-[var(--muted)] font-mono">
                              {req.driver.vehicle_label}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {timeSince(item.alertAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDivert && (
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-red-600 text-white animate-pulse">
                          DIVERSION REQUEST
                        </span>
                      )}
                      {!item.isAck && (
                        <button
                          type="button"
                          onClick={() => ackTacticalAlert(req.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-sm transition-all"
                        >
                          ✓ Acknowledge
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-xs font-semibold leading-relaxed">
                    &ldquo;{item.alertText}&rdquo;
                  </div>

                  {isDivert && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center gap-2">
                      <span className="text-[10px] text-[var(--muted)]">Reroute:</span>
                      <select
                        className="text-[11px] py-1 px-2 bg-[var(--surface)] border border-amber-500/50 text-[var(--foreground)] rounded font-medium focus:ring-1 focus:ring-amber-400"
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
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN REQUESTS TABLE */}
      {filteredRequests.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <p className="text-sm font-semibold">{empty}</p>
          {(selectedClusterFilter !== "all" || selectedSpecialtyFilter !== "all") && (
            <button
              onClick={() => {
                setSelectedClusterFilter("all");
                setSelectedSpecialtyFilter("all");
              }}
              className="mt-2 text-xs text-emerald-400 underline"
            >
              Reset active filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Patient / Region</th>
                <th>Triage & SBAR</th>
                <th>SLA Countdown</th>
                <th>Status</th>
                <th>Facility</th>
                <th>Ambulance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => {
                const targets = allowedTargets(rules, r.status, actorRole);
                const showHospital = targets.some(needsHospital);
                const showDriver = targets.some(needsDriver) && !r.driver_id;
                const selectedDriver = driverDraft[r.id] ?? r.driver_id ?? "";
                const selectedHospital = hospitalDraft[r.id] ?? r.hospital_id ?? "";

                const effectiveCap = getHospitalCapacity(selectedHospital, r, hospitals);
                const isSelectedHospitalFull = effectiveCap === 0;
                const isHighlighted = highlightedRequestId === r.id;

                // SLA & Regional Calculations
                const clusterId = resolveItemCluster(r);
                const clusterInfo = REGION_CLUSTERS[clusterId];
                const sla = computeRequestSLA(r.created_at, r.status, clusterId);
                const sbar = parseSBARHandover(r.notes);

                return (
                  <tr
                    key={r.id}
                    className={`transition-all duration-500 ${
                      isHighlighted
                        ? "bg-amber-500/20 dark:bg-amber-950/70 ring-2 ring-amber-500 animate-pulse"
                        : sla.tier === 3
                        ? "bg-rose-950/20"
                        : ""
                    }`}
                  >
                    {/* Patient & Regional Cluster */}
                    <td className="max-w-[240px]">
                      <div className="font-semibold text-sm leading-snug text-slate-900 dark:text-slate-100 flex items-start gap-1">
                        <span className="text-red-500 mt-0.5">📍</span>
                        <span>{formatLocation(r)}</span>
                      </div>

                      {/* Cluster pill */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${clusterInfo?.tagColor || 'bg-slate-800 text-slate-300'}`}>
                          {clusterInfo?.shortName || clusterId}
                        </span>
                        {(() => {
                          const age = resolvePatientAgeBand(r);
                          return age && age !== "unknown" ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] border border-slate-700">
                              Age: {age}
                            </span>
                          ) : null;
                        })()}
                      </div>

                      {r.contact_phone && (
                        <div className="mt-1.5">
                          <a
                            href={`tel:${r.contact_phone}`}
                            className="font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded shadow-sm inline-flex items-center gap-1 transition-all"
                          >
                            <span>📞</span>
                            <span>{r.contact_phone}</span>
                          </a>
                        </div>
                      )}
                    </td>

                    {/* Triage & SBAR Clinical Handover */}
                    <td className="max-w-[250px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs uppercase tracking-wide">
                          {r.emergency_type || "General"}
                        </span>
                        {r.priority === 1 && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-black border border-rose-500/30">
                            P1 CRITICAL
                          </span>
                        )}
                      </div>

                      {/* Patient cancellation alert */}
                      {(() => {
                        const cancellation = parsePatientCancellation(
                          r.notes,
                          (r as unknown as { cancelled_reason?: string }).cancelled_reason
                        );
                        if (!cancellation) return null;
                        return (
                          <div className="mt-1.5 rounded bg-rose-500/20 border border-rose-500/50 p-1.5 text-xs text-rose-300 animate-pulse">
                            <span className="font-black text-[10px] block uppercase">🛑 Cancelled by Client</span>
                            <span className="font-medium text-[11px]">&ldquo;{cancellation.reason}&rdquo;</span>
                          </div>
                        );
                      })()}

                      {/* SBAR Pre-alert Badge / Inspection button */}
                      {sbar ? (
                        <div className="mt-1.5 p-1.5 rounded bg-teal-950/40 border border-teal-800/60">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-teal-300 flex items-center gap-1">
                              <span>📋</span> SBAR Pre-Alert Ready
                            </span>
                            <button
                              type="button"
                              onClick={() => setInspectSbarModal({ request: r, sbar })}
                              className="text-[10px] font-bold text-teal-200 underline hover:text-white"
                            >
                              Inspect SBAR
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-300 mt-1 line-clamp-2">
                            {formatSBARSummary(sbar).situation}
                          </div>
                          {sbar.recommendation.bloodBankPreAlert && (
                            <span className="inline-block mt-1 px-1.5 py-0.2 bg-red-600 text-white rounded text-[9px] font-bold">
                              🩸 O-Neg Blood Alert
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-slate-400">
                          {getCleanMedicalNotes(r.notes) || "Standard triage protocol"}
                        </div>
                      )}
                    </td>

                    {/* Real-time SLA Countdown */}
                    <td className="min-w-[150px]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-bold ${sla.isBreached ? 'text-rose-400' : sla.isApproachingBreach ? 'text-amber-400' : 'text-slate-300'}`}>
                            {sla.tierLabel}
                          </span>
                          {!sla.isBreached && sla.minutesRemaining > 0 && (
                            <span className="font-mono text-xs text-emerald-400 font-semibold">
                              {sla.minutesRemaining}m
                            </span>
                          )}
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              sla.tier === 3
                                ? "bg-rose-600"
                                : sla.isBreached
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${sla.progressPercent}%` }}
                          />
                        </div>

                        {/* Tier 3 Hotline Fallback Trigger */}
                        {sla.tier === 3 && sla.fallbackHotline && (
                          <div className="mt-1 pt-1 border-t border-slate-800">
                            <a
                              href={`tel:${sla.fallbackHotline}`}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] flex items-center justify-center gap-1 shadow-sm"
                            >
                              <span>🚨 State Fallback Hotline</span>
                            </a>
                            <span className="text-[9px] text-slate-400 block text-center mt-0.5">
                              {sla.fallbackAgency}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={r.status} />
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {timeSince(r.created_at)}
                      </div>
                    </td>

                    {/* Facility Intake */}
                    <td className="max-w-[180px]">
                      <div className="font-medium text-xs text-slate-200">
                        {r.hospital?.name || "Unassigned"}
                      </div>
                      {r.hospital && r.hospital.available_capacity != null && (
                        <div className={`text-[10px] font-semibold mt-0.5 ${
                          r.hospital.available_capacity === 0 ? "text-rose-400" : "text-emerald-400"
                        }`}>
                          {r.hospital.available_capacity === 0 ? "0 beds (Full)" : `${r.hospital.available_capacity} beds ready`}
                        </div>
                      )}
                    </td>

                    {/* Driver Unit */}
                    <td className="max-w-[160px]">
                      {r.driver ? (
                        <div>
                          <div className="font-semibold text-xs text-slate-200">
                            {r.driver.display_name}
                          </div>
                          {r.driver.vehicle_label && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {r.driver.vehicle_label}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>

                    {/* Dispatcher Actions */}
                    <td>
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        {showHospital && (
                          <select
                            className={`select text-xs py-1 ${
                              isSelectedHospitalFull ? "border-red-500 text-red-400" : ""
                            }`}
                            value={selectedHospital}
                            onChange={async (e) => {
                              const value = e.target.value;
                              if (!value) return;
                              setHospitalDraft((h) => ({ ...h, [r.id]: value }));
                              await supabase.rpc("assign_emergency_hospital", {
                                p_request_id: r.id,
                                p_hospital_id: value,
                              });
                              router.refresh();
                            }}
                          >
                            <option value="">Select hospital</option>
                            {hospitals.map((h) => {
                              const cap = getHospitalCapacity(h.id, r, hospitals);
                              const isFull = cap === 0;
                              return (
                                <option key={h.id} value={h.id} disabled={isFull}>
                                  {h.name} {cap != null ? (isFull ? "⛔ (0 beds - FULL)" : `(${cap} beds)`) : ""}
                                </option>
                              );
                            })}
                          </select>
                        )}

                        {showDriver && (
                          <select
                            className="select text-xs py-1"
                            value={selectedDriver}
                            onChange={async (e) => {
                              const value = e.target.value;
                              setDriverDraft((d) => ({ ...d, [r.id]: value }));
                              if (!value) return;
                              await supabase.rpc("assign_emergency_driver", {
                                p_request_id: r.id,
                                p_driver_id: value,
                              });
                              setOk("Ambulance driver allocated.");
                              router.refresh();
                            }}
                          >
                            <option value="">Select ambulance</option>
                            {drivers.map((d) => {
                              const isOffDuty = d.duty_status === "off_duty" || d.active === false;
                              return (
                                <option key={d.id} value={d.id}>
                                  {isOffDuty ? "⚪ [OFF DUTY] " : "🟢 [READY] "}
                                  {d.display_name || "Driver"}
                                  {d.vehicle_label ? ` · ${d.vehicle_label}` : ""}
                                </option>
                              );
                            })}
                          </select>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {targets.length === 0 && (
                            <span className="text-[11px] text-slate-500">No transitions</span>
                          )}
                          {targets.map((to) => {
                            const isHospAction = needsHospital(to);
                            const isBlocked = isHospAction && isSelectedHospitalFull;

                            return (
                              <button
                                key={to}
                                className={`btn text-xs py-1 px-2.5 ${
                                  isBlocked
                                    ? "bg-red-950/60 text-red-400 border border-red-800 cursor-not-allowed opacity-60 font-bold"
                                    : "btn-primary"
                                }`}
                                disabled={busyId === r.id || isBlocked}
                                onClick={() => transition(r, to)}
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
      )}

      {/* SBAR CLINICAL INSPECTION MODAL */}
      {inspectSbarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-teal-500/50 rounded-xl max-w-lg w-full p-5 shadow-2xl relative text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="font-bold text-base text-teal-300">Standardized SBAR Clinical Handover</h3>
                  <span className="text-xs text-slate-400">
                    Specialty: {inspectSbarModal.sbar.specialty.toUpperCase()} | {inspectSbarModal.sbar.situation.priorityTier}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectSbarModal(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="font-bold text-teal-400 uppercase text-[10px]">Situation:</div>
                <div className="mt-1 font-semibold">{inspectSbarModal.sbar.situation.primaryComplaint}</div>
                <div className="mt-0.5 text-slate-400">Vitals: {inspectSbarModal.sbar.situation.vitalsSummary}</div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="font-bold text-teal-400 uppercase text-[10px]">Background:</div>
                <div className="mt-1 text-slate-300">{formatSBARSummary(inspectSbarModal.sbar).background}</div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="font-bold text-teal-400 uppercase text-[10px]">Assessment:</div>
                <div className="mt-1 text-slate-300">{inspectSbarModal.sbar.assessment.fieldImpression}</div>
                <div className="mt-0.5 text-amber-400 font-medium">Stability: {inspectSbarModal.sbar.assessment.stability}</div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-teal-900/60">
                <div className="font-bold text-teal-400 uppercase text-[10px]">Recommendation & Prep:</div>
                <div className="mt-1 font-semibold text-white">Target Bay: {inspectSbarModal.sbar.recommendation.requiredBay}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inspectSbarModal.sbar.recommendation.bloodBankPreAlert ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    Blood Bank: {inspectSbarModal.sbar.recommendation.bloodBankPreAlert ? 'PRE-ALERTED' : 'Standby'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inspectSbarModal.sbar.recommendation.theaterPrepRequired ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    Theater Prep: {inspectSbarModal.sbar.recommendation.theaterPrepRequired ? 'ACTIVE' : 'Standby'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectSbarModal(null)}
                className="btn btn-primary px-5 text-xs"
              >
                Close Handover
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={error} kind="error" onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </>
  );
}
