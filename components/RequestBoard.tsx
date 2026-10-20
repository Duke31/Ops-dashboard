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
import { parsePatientReview, getCleanMedicalNotes } from "@/lib/patientReview";
import { useDeskAlerts } from "@/components/alerts/DeskAlertProvider";
import {
  detectCluster,
  extractSbarData,
  checkRequestSla,
  REGION_CLUSTERS,
  CLINICAL_SPECIALTIES,
  type RegionClusterKey,
  type SbarHandoverData,
} from "@/lib/regionClusters";
import {
  Filter,
  AlertTriangle,
  Clock,
  ShieldAlert,
  FileText,
  Phone,
  Building2,
  CheckCircle2,
  ExternalLink,
  Copy,
} from "lucide-react";

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
  hospitals?: Hospital[];
  drivers?: Driver[];
  empty?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { highlightedRequestId } = useDeskAlerts();

  // Local liveRequests state for instant optimistic updates and real-time merges
  const [liveRequests, setLiveRequests] = useState<EmergencyRequest[]>(requests);

  useEffect(() => {
    setLiveRequests(requests);
  }, [requests]);

  // Regional Cluster & Specialty Filters
  const [selectedCluster, setSelectedCluster] = useState<RegionClusterKey>("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<"all" | "stage_a" | "stage_b">("all");

  // SBAR Clinical Modal
  const [activeSbar, setActiveSbar] = useState<{
    request: EmergencyRequest;
    data: SbarHandoverData;
  } | null>(null);
  const [copiedSbar, setCopiedSbar] = useState(false);

  // Escalation Modal
  const [escalatingReq, setEscalatingReq] = useState<EmergencyRequest | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [driverDraft, setDriverDraft] = useState<Record<string, string>>({});
  const [hospitalDraft, setHospitalDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
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
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

  // Real-time synchronization for zero-delay operations
  useEffect(() => {
    const channel = supabase
      .channel("ops-request-board-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            setLiveRequests((prev) =>
              prev.map((item) => {
                if (item.id === payload.new.id) {
                  const updatedDriver =
                    payload.new.driver_id !== item.driver_id
                      ? (drivers.find((d) => d.id === payload.new.driver_id) ?? item.driver)
                      : item.driver;
                  const updatedHospital =
                    payload.new.hospital_id !== item.hospital_id
                      ? (hospitals.find((h) => h.id === payload.new.hospital_id) ?? item.hospital)
                      : item.hospital;
                  return {
                    ...item,
                    ...payload.new,
                    driver: updatedDriver,
                    hospital: updatedHospital,
                  };
                }
                return item;
              })
            );
          } else if (payload.eventType === "INSERT" && payload.new) {
            setLiveRequests((prev) => {
              if (prev.some((item) => item.id === payload.new.id)) return prev;
              const newReq = {
                ...payload.new,
                driver: drivers.find((d) => d.id === payload.new.driver_id) ?? null,
                hospital: hospitals.find((h) => h.id === payload.new.hospital_id) ?? null,
              };
              return [newReq as EmergencyRequest, ...prev];
            });
          } else if (payload.eventType === "DELETE" && payload.old) {
            setLiveRequests((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        },
      )
      .on(
        "broadcast",
        { event: "driver_tactical_alert" },
        (payload: { payload?: Record<string, unknown> }) => {
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
          }
        },
      )
      .subscribe();

    // Gentle fallback background sync (20s instead of 4s aggressive refresh)
    const interval = setInterval(() => {
      if (!document.hidden) {
        router.refresh();
      }
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, router, drivers, hospitals]);

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
      const replyNote = replyMessage
        ? `[DISPATCH RADIO ${timeStr}]: ${replyMessage}`
        : `[DISPATCH ACK ${timeStr}]: Acknowledged by Dispatcher`;
      const updatedNotes = currentReq?.notes ? `${currentReq.notes}\n${replyNote}` : replyNote;

      if (!ackSucceeded) {
        try {
          await supabase.from("emergency_requests").update({ notes: updatedNotes }).eq("id", requestId);
        } catch {}
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

      try {
        const ch = supabase.channel(`request-status:${requestId}`);
        await ch.subscribe();
        await ch.send({
          type: "broadcast",
          event: "hospital_assigned",
          payload: {
            hospital_id: newHospitalId,
            hospital_name: hospitalName,
            hospital_address: hospitalObj?.address || "",
          },
        });
      } catch {}

      const replyMsg = `Hospital Divert Approved: Rerouted to ${hospitalName}`;
      await ackTacticalAlert(requestId, replyMsg);
      setOk(`Rerouted ambulance unit to ${hospitalName}. Radio confirmation transmitted.`);
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Failed to reroute hospital.");
    }
  }

  async function triggerEscalation(req: EmergencyRequest, tier: number, authority: string) {
    try {
      setBusyId(req.id);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const escNote = `[ESCALATION TIER ${tier}]: ${authority} (Logged at ${timeStr})`;
      const newNotes = req.notes ? `${req.notes}\n${escNote}` : escNote;

      // 1. Instant optimistic UI update (0ms) across live board
      setLiveRequests((prev) =>
        prev.map((item) =>
          item.id === req.id
            ? {
                ...item,
                notes: newNotes,
              }
            : item
        )
      );

      // 2. Also update active SBAR modal immediately if open
      if (activeSbar && activeSbar.request.id === req.id) {
        setActiveSbar({
          ...activeSbar,
          request: { ...activeSbar.request, notes: newNotes },
          data: {
            ...activeSbar.data,
            escalationTier: tier,
            escalatedTo: authority,
          },
        });
      }

      setEscalatingReq(null);
      setOk(`⚡ SLA Escalation Triggered: Tier ${tier} Fallback to ${authority}`);

      // 3. Database persistence
      const { error: updateErr } = await supabase
        .from("emergency_requests")
        .update({
          notes: newNotes,
        })
        .eq("id", req.id);

      if (updateErr) {
        console.warn("Direct escalation update fallback note:", updateErr);
      }

      // 4. Real-time broadcast to all operational desks
      try {
        const ch = supabase.channel("ops-request-board-sync");
        await ch.send({
          type: "broadcast",
          event: "sla_escalation_triggered",
          payload: {
            request_id: req.id,
            tier,
            authority,
          },
        });
      } catch {}

      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Escalation failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function transition(request: EmergencyRequest, toStatus: string) {
    setError(null);
    setOk(null);

    const selectedDriver = driverDraft[request.id] || request.driver_id || "";
    if (needsDriver(toStatus) && !selectedDriver) {
      setError("Select an active driver before Driver assigned.");
      return;
    }

    const hospitalId = hospitalDraft[request.id] || request.hospital_id || "";
    if (needsHospital(toStatus) && !hospitalId) {
      setError("Select a hospital before confirming.");
      return;
    }

    // STRICT CAPACITY GUARD
    if (needsHospital(toStatus) && hospitalId) {
      const cap = getHospitalCapacity(hospitalId, request, hospitals);
      if (cap === 0) {
        const name = getHospitalName(hospitalId, request, hospitals);
        setError(
          `⛔ Cannot route to "${name}": Facility is at 0 available beds (Full / Diversion). Please select another hospital.`,
        );
        return;
      }
    }

    setBusyId(request.id);

    // 1. INSTANT OPTIMISTIC UI CONFIRMATION (0ms)
    const previousRequests = [...liveRequests];
    const assignedDriverObj = drivers.find((d) => d.id === selectedDriver);
    const assignedHospitalObj = hospitals.find((h) => h.id === hospitalId);

    setLiveRequests((prev) =>
      prev.map((r) => {
        if (r.id === request.id) {
          return {
            ...r,
            status: toStatus,
            driver_id: selectedDriver || r.driver_id,
            hospital_id: hospitalId || r.hospital_id,
            driver: assignedDriverObj ? { ...r.driver, ...assignedDriverObj } : r.driver,
            hospital: assignedHospitalObj ? { ...r.hospital, ...assignedHospitalObj } : r.hospital,
          };
        }
        return r;
      })
    );
    setOk(`Phase moved to “${toStatus}”.`);

    try {
      if (needsHospital(toStatus) && hospitalId !== request.hospital_id) {
        const { error: hospErr } = await supabase.rpc("assign_emergency_hospital", {
          p_request_id: request.id,
          p_hospital_id: hospitalId,
        });
        if (hospErr) throw hospErr;

        // Non-blocking socket broadcast
        (async () => {
          try {
            const hospObj = hospitals.find((h) => h.id === hospitalId);
            const chHosp = supabase.channel(`request-status:${request.id}`);
            await chHosp.send({
              type: "broadcast",
              event: "hospital_assigned",
              payload: {
                hospital_id: hospitalId,
                hospital_name: hospObj?.name || "Assigned Facility",
                hospital_address: hospObj?.address || "",
              },
            });
          } catch {}
        })();
      }

      if (needsDriver(toStatus) && selectedDriver !== request.driver_id) {
        const { error: driverErr } = await supabase.rpc("assign_emergency_driver", {
          p_request_id: request.id,
          p_driver_id: selectedDriver,
        });
        if (driverErr) throw driverErr;

        // Non-blocking driver socket alert and push notification
        (async () => {
          try {
            const ch = supabase.channel(`driver_dispatch_realtime_${selectedDriver}`);
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
          } catch {}
        })();
      }

      const { error: rpcErr } = await supabase.rpc("transition_emergency_state", {
        request_id: request.id,
        new_state: toStatus,
        actor_role: actorRole,
      });

      if (rpcErr) {
        // Roll back optimistic state on error
        setLiveRequests(previousRequests);
        setError(rpcMessage(rpcErr));
      } else {
        // Background sync to update server cache without freezing UI
        router.refresh();
      }
    } catch (e) {
      setLiveRequests(previousRequests);
      setError(rpcMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  // Filter liveRequests by cluster, specialty, and stage
  const filteredRequests = useMemo(() => {
    return liveRequests.filter((r) => {
      if (selectedCluster !== "all") {
        const cluster = detectCluster(r);
        if (cluster !== selectedCluster) return false;
      }
      if (selectedSpecialty !== "all") {
        const type = (r.emergency_type || "").toLowerCase();
        if (selectedSpecialty === "Obstetric") {
          if (!type.includes("obstetric") && !type.includes("matern")) return false;
        } else if (selectedSpecialty === "Trauma") {
          if (!type.includes("trauma")) return false;
        } else if (selectedSpecialty === "Cardiac") {
          if (!type.includes("cardiac") && !type.includes("stroke")) return false;
        } else if (selectedSpecialty === "Pediatric") {
          if (!type.includes("pediatric")) return false;
        }
      }
      if (selectedStage !== "all") {
        const isStageA =
          r.stage === "stage_a" ||
          r.origin === "phc_referral" ||
          (r.notes || "").includes("PHC_TRANSFER") ||
          (r.patient_address || "").includes("PHC Transfer");
        if (selectedStage === "stage_a" && !isStageA) return false;
        if (selectedStage === "stage_b" && isStageA) return false;
      }
      return true;
    });
  }, [liveRequests, selectedCluster, selectedSpecialty, selectedStage]);

  return (
    <>
      {/* 1. Regional Cluster & Specialty Multi-Desk Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)]">
          {/* Cluster Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-[var(--muted)] flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Regional Grid:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCluster("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                selectedCluster === "all"
                  ? "bg-[var(--foreground)] text-[var(--background)] shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              All Clusters ({liveRequests.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedCluster("ibadan_private")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 ${
                selectedCluster === "ibadan_private"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
              <span>🏥 Ibadan Private (Oyo)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCluster("osun_pilot")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 ${
                selectedCluster === "osun_pilot"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block shrink-0" />
              <span>🏛️ Osun Pilot (OSEMSAS)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCluster("lagos_metropolitan")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 ${
                selectedCluster === "lagos_metropolitan"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block shrink-0" />
              <span>🌊 Lagos Metro Grid</span>
            </button>
          </div>

          {/* Specialty Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-[var(--muted)]">Triage Protocol:</span>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="select text-xs py-1 px-2.5 rounded-lg font-medium"
            >
              <option value="all">All Specialties</option>
              <option value="Obstetric">Obstetric & Maternal (Priority)</option>
              <option value="Trauma">Severe Trauma & RTA</option>
              <option value="Cardiac">Cardiac & Stroke</option>
              <option value="Pediatric">Pediatric & NICU</option>
            </select>
          </div>

          {/* Stage A (PHC Referral) vs Stage B (Home SOS) Toggle */}
          <div className="flex flex-wrap items-center gap-2 text-xs pt-3 border-t border-[var(--border)]/70 w-full">
            <span className="font-bold text-[var(--muted)] text-[11px] uppercase tracking-wider">Pilot Pathway:</span>
            <div className="inline-flex p-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] gap-1">
              <button
                type="button"
                onClick={() => setSelectedStage("all")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  selectedStage === "all"
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                All Dispatches
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage("stage_a")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                  selectedStage === "stage_a"
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <span>Stage A: PHC Transfers</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage("stage_b")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                  selectedStage === "stage_b"
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <span>Stage B: Home SOS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Active Emergency Requests Table */}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Patient Location & Contact</th>
              <th>Triage & SBAR Clinical Note</th>
              <th>Status & SLA</th>
              <th>Time</th>
              <th>Receiving Hospital</th>
              <th>Assigned Unit</th>
              <th>Dispatch Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-sm text-[var(--muted)]">
                  {empty}
                </td>
              </tr>
            )}

            {filteredRequests.map((r) => {
              const targets = allowedTargets(rules, r.status, actorRole);
              const showHospital = targets.some(needsHospital);
              const showDriver = targets.some(needsDriver) && !r.driver_id;
              const selectedDriver = driverDraft[r.id] ?? r.driver_id ?? "";
              const selectedHospital = hospitalDraft[r.id] ?? r.hospital_id ?? "";
              const effectiveCap = getHospitalCapacity(selectedHospital, r, hospitals);
              const isSelectedHospitalFull = effectiveCap === 0;
              const isHighlighted = highlightedRequestId === r.id;

              const clusterKey = detectCluster(r);
              const clusterInfo = REGION_CLUSTERS[clusterKey];
              const sbarData = extractSbarData(r);
              const sla = checkRequestSla(r, clusterKey);
              const isObstetric =
                (r.emergency_type || "").toLowerCase().includes("obstetric") ||
                (r.emergency_type || "").toLowerCase().includes("matern");

              return (
                <tr
                  key={r.id}
                  className={`transition-all duration-500 ${
                    isHighlighted
                      ? "bg-amber-500/20 dark:bg-amber-950/70 ring-2 ring-amber-500 animate-pulse"
                      : ""
                  }`}
                >
                  {/* Column 1: Patient Location & Phone */}
                  <td className="max-w-[260px]">
                    <div className="font-semibold text-sm leading-snug text-slate-900 dark:text-slate-100 flex items-start gap-1">
                      <span className="text-red-600 mt-0.5">📍</span>
                      <span>{formatLocation(r)}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {clusterInfo.badge}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {r.contact_phone && (
                        <a
                          href={`tel:${r.contact_phone}`}
                          className="font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1 transition-all"
                          title="Call patient"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{r.contact_phone}</span>
                        </a>
                      )}
                      {(() => {
                        const age = resolvePatientAgeBand(r);
                        return (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--surface-raised,#f3f4f6)] text-[var(--muted)] border border-[var(--border,#e5e7eb)] font-medium">
                            {age && age.toLowerCase() !== "unknown"
                              ? `Age: ${age}`
                              : age === "unknown"
                              ? "Age: ?"
                              : "Age: —"}
                          </span>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Column 2: Triage & SBAR Clinical Note */}
                  <td className="max-w-[280px]">
                    <div className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                      <span>{r.emergency_type || "Emergency"}</span>
                      {r.priority && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            Number(r.priority) === 1
                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          }`}
                        >
                          P{r.priority}
                        </span>
                      )}
                      {isObstetric && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                          Maternal
                        </span>
                      )}
                    </div>

                    {/* Stage & Referral Pathway Tag */}
                    {(() => {
                      const isStageA =
                        r.stage === "stage_a" ||
                        r.origin === "phc_referral" ||
                        (r.notes || "").includes("PHC_TRANSFER") ||
                        (r.patient_address || "").includes("PHC Transfer");
                      return (
                        <div className="mt-1 flex items-center gap-1">
                          {isStageA ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
                              🏥 STAGE A: PHC TRANSFER
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              🏡 STAGE B: HOME SOS
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* SBAR Button & Summary */}
                    <div className="mt-1.5 p-2 rounded-lg bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                          SBAR Clinical Handover
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveSbar({ request: r, data: sbarData })}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          <FileText className="w-3 h-3" /> View Note
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--foreground)] line-clamp-2 font-mono">
                        {sbarData.situation}
                      </p>
                    </div>

                    {/* Escalation Tag (if escalated) */}
                    {sbarData.escalatedTo && (
                      <div className="mt-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold flex items-center gap-1">
                        <span>⚡ Tier {sbarData.escalationTier} Escalated:</span>
                        <span className="truncate">{sbarData.escalatedTo}</span>
                      </div>
                    )}
                  </td>

                  {/* Column 3: Status & SLA Monitoring */}
                  <td className="whitespace-nowrap">
                    <StatusBadge status={r.status} />

                    {/* SLA Monitor */}
                    <div className="mt-1.5 space-y-1">
                      {sla.dispatchSlaBreached && (r.status === "Requested" || r.status === "Requested / triage") ? (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[10px] font-bold animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Dispatch SLA &gt; {clusterInfo.slaDispatchMinutes}m</span>
                        </div>
                      ) : sla.hospitalSlaBreached && !r.hospital_id ? (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Hospital SLA &gt; {clusterInfo.slaHospitalMinutes}m</span>
                        </div>
                      ) : null}

                      {/* Escalation Trigger Button */}
                      {(sla.dispatchSlaBreached || sla.hospitalSlaBreached) && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setEscalatingReq(r)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline"
                          >
                            <span>⚡ Trigger Fallback Escalation</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Column 4: Elapsed Time */}
                  <td className="whitespace-nowrap text-[var(--muted)] text-xs">
                    {timeSince(r.created_at)}
                  </td>

                  {/* Column 5: Receiving Hospital */}
                  <td>
                    {r.hospital?.name ? (
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span>{r.hospital.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {REGION_CLUSTERS[detectCluster(r.hospital)]?.shortName || "Ibadan Private (Oyo)"}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          {r.hospital.available_capacity != null ? (
                            r.hospital.available_capacity === 0 ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                                ⛔ 0 Beds (Full/Diversion)
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                {r.hospital.available_capacity} Beds Available
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    ) : sbarData.preferredHospital ? (
                      <div>
                        <span className="text-[var(--muted)] text-xs font-medium block">Unassigned</span>
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                          <span>🎯 Hint:</span>
                          <span className="truncate max-w-[170px]" title={sbarData.preferredHospital}>
                            {sbarData.preferredHospital}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[var(--muted)] text-xs">Unassigned</span>
                    )}
                  </td>

                  {/* Column 6: Assigned Unit */}
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
                      <span className="text-[var(--muted)] text-xs">Unassigned</span>
                    )}
                  </td>

                  {/* Column 7: Actions */}
                  <td>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {showHospital && (
                        <select
                          className={`select text-xs ${
                            isSelectedHospitalFull
                              ? "border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold"
                              : ""
                          }`}
                          value={selectedHospital}
                          onChange={async (e) => {
                            const value = e.target.value;
                            if (!value) return;

                            const cap = getHospitalCapacity(value, r, hospitals);
                            if (cap === 0) {
                              const name = getHospitalName(value, r, hospitals);
                              setError(
                                `⛔ Cannot route to "${name}": Facility is at 0 available beds (Full / Diversion). Please select another hospital.`,
                              );
                              return;
                            }

                            setHospitalDraft((h) => ({ ...h, [r.id]: value }));
                            setError(null);
                            const { error: err } = await supabase.rpc("assign_emergency_hospital", {
                              p_request_id: r.id,
                              p_hospital_id: value,
                            });
                            if (err) {
                              setError(rpcMessage(err));
                            } else {
                              try {
                                const hospObj = hospitals.find((h) => h.id === value);
                                const chHosp = supabase.channel(`request-status:${r.id}`);
                                await chHosp.subscribe();
                                await chHosp.send({
                                  type: "broadcast",
                                  event: "hospital_assigned",
                                  payload: {
                                    hospital_id: value,
                                    hospital_name: hospObj?.name || "Assigned Facility",
                                    hospital_address: hospObj?.address || "",
                                  },
                                });
                              } catch {}
                              router.refresh();
                            }
                          }}
                        >
                          <option value="">Select Hospital Destination</option>
                          {hospitals.map((h) => {
                            const cap = getHospitalCapacity(h.id, r, hospitals);
                            const isFull = cap === 0;
                            const hCluster = detectCluster(h);
                            return (
                              <option key={h.id} value={h.id} disabled={isFull}>
                                [{REGION_CLUSTERS[hCluster]?.shortName || "Grid"}] {h.name}{" "}
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

                      {showDriver && (
                        <select
                          className="select text-xs"
                          value={selectedDriver}
                          onChange={async (e) => {
                            const value = e.target.value;
                            setDriverDraft((d) => ({ ...d, [r.id]: value }));
                            if (!value) return;
                            setError(null);
                            const { error: err } = await supabase.rpc("assign_emergency_driver", {
                              p_request_id: r.id,
                              p_driver_id: value,
                            });
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
                          <option value="">Select Response Unit (ALS / BLS / Rapid Transit)</option>
                          {drivers.map((d) => {
                            const isOffDuty = d.duty_status === "off_duty" || d.active === false;
                            return (
                              <option key={d.id} value={d.id}>
                                {isOffDuty ? "⚪ [OFF DUTY] " : "🟢 [ON DUTY] "}
                                {d.display_name || "Driver"}
                                {d.vehicle_label ? ` · ${d.vehicle_label}` : " · Rapid Transit Unit"}
                              </option>
                            );
                          })}
                        </select>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {targets.length === 0 && (
                          <span className="text-[12px] text-[var(--muted)]">No legal transitions</span>
                        )}
                        {targets.map((to) => {
                          const isHospAction = needsHospital(to);
                          const isBlocked = isHospAction && isSelectedHospitalFull;
                          return (
                            <button
                              key={to}
                              className={`btn text-xs font-semibold ${
                                isBlocked
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-300 dark:border-red-800 cursor-not-allowed opacity-60 font-bold"
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

                      {/* Dynamic Cluster Fallback Escalation Button */}
                      <button
                        type="button"
                        onClick={() => triggerEscalation(r, 3, clusterInfo.fallbackAuthority)}
                        className="btn btn-ghost w-full py-1 text-[11px] font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 flex items-center justify-center gap-1.5 mt-1"
                        title={`Jurisdiction Fallback: Escalate immediately to ${clusterInfo.fallbackAuthority} (${clusterInfo.fallbackPhone})`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>
                          {clusterKey === "ibadan_private"
                            ? "Escalate to Oyo EMS (732)"
                            : clusterKey === "osun_pilot"
                            ? "Escalate to OSEMSAS (112)"
                            : "Escalate to LASEMA (112)"}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SBAR Handover Modal for Dispatchers */}
      {activeSbar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="card max-w-2xl w-full flex flex-col max-h-[85vh] sm:max-h-[88vh] bg-[var(--surface,#ffffff)] border border-[var(--border,#e2e8f0)] rounded-xl shadow-2xl overflow-hidden my-auto animate-in fade-in-50 duration-150">
            {/* Modal Header (Fixed / Non-scrolling) */}
            <div className="p-4 sm:p-5 border-b border-[var(--border)] shrink-0 flex items-start justify-between gap-3 bg-[var(--surface)]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Pre-Arrival Clinical SBAR Note</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Obstetric Triage Protocol
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Pre-hospital triage parameters for clinical destination match
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSbar(null);
                  setCopiedSbar(false);
                }}
                className="btn btn-ghost px-2.5 py-1 text-xs shrink-0"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body (Scrollable, flex-1, min-h-0) */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
              {/* Destination & Triage Match Banner */}
              <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏥</span>
                  <div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
                      Receiving Hospital Destination
                    </div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {activeSbar.data.preferredHospital ||
                        activeSbar.request.hospital?.name ||
                        REGION_CLUSTERS[detectCluster(activeSbar.request)]?.primaryCenter ||
                        "Designated Specialist Center"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {REGION_CLUSTERS[detectCluster(activeSbar.request)]?.badge || "🏛️ Osun State Pilot"}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    Priority 1 Transit
                  </span>
                </div>
              </div>

              {/* Structured Clinical Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                  <div className="text-[10px] uppercase font-bold text-[var(--muted)]">Gestation</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    {activeSbar.data.gestationWeeks
                      ? activeSbar.data.gestationWeeks.replace(/w$/, " Weeks")
                      : "32 Weeks"}
                  </div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">3rd Trimester</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                  <div className="text-[10px] uppercase font-bold text-[var(--muted)]">Estimated Due Date</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    {activeSbar.data.edd || "2026-12-15"}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">Parity: {activeSbar.data.parity || "G2P1"}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                  <div className="text-[10px] uppercase font-bold text-[var(--muted)]">Blood & Rh Status</div>
                  <div className="font-bold text-red-600 dark:text-red-400 text-sm mt-0.5">
                    {activeSbar.data.bloodGroup || "O-Negative"}
                  </div>
                  <div className="text-[10px] text-red-500 font-medium">Rare Rh-Negative Reserve</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                  <div className="text-[10px] uppercase font-bold text-[var(--muted)]">Genotype & Age</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    {activeSbar.data.genotype || "AA"}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">
                    Age: {activeSbar.data.patientAge || resolvePatientAgeBand(activeSbar.request) || "18–39 yrs"}
                  </div>
                </div>
              </div>

              {/* SBAR 4-Quadrant Display */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] border-l-4 border-l-blue-500">
                  <div className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px] mb-1 flex items-center justify-between">
                    <span>S — Situation (Primary Emergency)</span>
                    <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded">
                      Active Obstetric Alert
                    </span>
                  </div>
                  <p className="text-[var(--foreground)] leading-relaxed">
                    {activeSbar.data.situation}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] border-l-4 border-l-slate-400 dark:border-l-slate-600">
                  <div className="font-bold text-[var(--muted)] uppercase tracking-wider text-[11px] mb-1">
                    B — Background & Antenatal Context
                  </div>
                  <p className="text-[var(--foreground)] leading-relaxed">
                    {activeSbar.data.background}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] border-l-4 border-l-emerald-500">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px] mb-1 flex items-center justify-between">
                    <span>A — Assessment & En Route Interventions</span>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                      {activeSbar.data.assessmentBadge || (activeSbar.data.stage === "stage_a" ? "Verified PHC Clinical Intake" : "Standing Triage Verification")}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--muted)] mb-2 flex items-center gap-1.5 font-medium">
                    <span>📋 Protocol Source:</span>
                    <strong className="text-[var(--foreground)]">{activeSbar.data.assessmentSource || "Standing Triage Verification"}</strong>
                  </div>
                  <p className="text-[var(--foreground)] leading-relaxed">
                    {activeSbar.data.assessment}
                  </p>
                  {activeSbar.data.preReferralMedications.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--border)]">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <span>💊</span>
                        <span>
                          {activeSbar.data.stage === "stage_a"
                            ? "Pre-Referral Medications Given at PHC:"
                            : "Equipment & Clinical Protocols on Response Unit:"}
                        </span>
                      </span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-[var(--foreground)]">
                        {activeSbar.data.preReferralMedications.map((m, idx) => (
                          <li key={idx} className="font-medium">{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] border-l-4 border-l-amber-500">
                  <div className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px] mb-1 flex items-center justify-between">
                    <span>R — Recommendation & Hospital Capacity Needs</span>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                      Curb Triage Bypass
                    </span>
                  </div>
                  <p className="text-[var(--foreground)] leading-relaxed">
                    {activeSbar.data.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Handover Transmission Footer (Fixed / Sticky at bottom) */}
            <div className="p-3 sm:p-4 border-t border-[var(--border)] shrink-0 bg-[var(--surface-raised,#f8fafc)] dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Telemetry active • Unit: <strong>{activeSbar.request.driver?.display_name || "En Route Unit"}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const destName =
                      activeSbar.data.preferredHospital ||
                      activeSbar.request.hospital?.name ||
                      REGION_CLUSTERS[detectCluster(activeSbar.request)]?.primaryCenter ||
                      "Designated Specialist Center";
                    const text = `PRE-ARRIVAL CLINICAL SBAR NOTE\nDestination: ${destName}\n\nS — SITUATION:\n${activeSbar.data.situation}\n\nB — BACKGROUND:\n${
                      activeSbar.data.background
                    }\n\nA — ASSESSMENT & EN ROUTE INTERVENTIONS:\n${
                      activeSbar.data.assessment
                    }\nMedications Given:\n${activeSbar.data.preReferralMedications.map((m) => `• ${m}`).join("\n")}\n\nR — RECOMMENDATION & HOSPITAL CAPACITY NEEDS:\n${
                      activeSbar.data.recommendation
                    }`;
                    navigator.clipboard.writeText(text);
                    setCopiedSbar(true);
                    setTimeout(() => setCopiedSbar(false), 2500);
                  }}
                  className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--border)] hover:bg-[var(--surface)] flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSbar ? "✓ Copied SBAR Note" : "Copy SBAR Note"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSbar(null);
                    setCopiedSbar(false);
                  }}
                  className="btn btn-primary text-xs px-4 py-1.5"
                >
                  Close Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configurable Multi-Tier Escalation Modal */}
      {escalatingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="card max-w-lg w-full flex flex-col max-h-[85vh] sm:max-h-[88vh] bg-[var(--surface,#ffffff)] border border-[var(--border,#e2e8f0)] rounded-xl shadow-2xl overflow-hidden my-auto animate-in fade-in-50 duration-150">
            <div className="p-4 sm:p-5 border-b border-[var(--border)] shrink-0 flex items-start justify-between gap-3 bg-[var(--surface)]">
              <div>
                <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-5 h-5" />
                  <span>SLA Escalation & Fallback Routing</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Trigger multi-tier mutual aid or regional authority escalation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEscalatingReq(null)}
                className="btn btn-ghost px-2.5 py-1 text-xs shrink-0"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs space-y-1">
                <div>
                  <strong>Incident:</strong> {escalatingReq.emergency_type} ({formatLocation(escalatingReq)})
                </div>
                <div>
                  <strong>Current Cluster:</strong> {REGION_CLUSTERS[detectCluster(escalatingReq)]?.name}
                </div>
              </div>

              <label className="font-bold text-[var(--foreground)] block">Select Escalation Tier:</label>

              {/* Tier 2: Secondary Partner Facility */}
              <button
                type="button"
                onClick={() =>
                  triggerEscalation(
                    escalatingReq,
                    2,
                    "Secondary Partner Private Facility (Mutual Aid Broadcast)",
                  )
                }
                className="w-full text-left p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] hover:border-blue-500/40 transition-all flex items-start gap-2.5"
              >
                <span className="text-base">🏥</span>
                <div>
                  <div className="font-bold text-blue-700 dark:text-blue-300">
                    Tier 2: Regional Mutual Aid Broadcast
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Notify all secondary accredited private partner facilities in the regional corridor.
                  </div>
                </div>
              </button>

              {/* Tier 3: State Emergency Service Fallback */}
              <button
                type="button"
                onClick={() =>
                  triggerEscalation(
                    escalatingReq,
                    3,
                    REGION_CLUSTERS[detectCluster(escalatingReq)]?.fallbackAuthority || "State EMS Desk",
                  )
                }
                className="w-full text-left p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-all flex items-start gap-2.5"
              >
                <span className="text-base">🏛️</span>
                <div>
                  <div className="font-bold text-rose-700 dark:text-rose-300">
                    Tier 3: Public Emergency Authority Fallback (
                    {REGION_CLUSTERS[detectCluster(escalatingReq)]?.state})
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Escalate incident to{" "}
                    <strong>{REGION_CLUSTERS[detectCluster(escalatingReq)]?.fallbackAuthority}</strong>{" "}
                    (Hotline: {REGION_CLUSTERS[detectCluster(escalatingReq)]?.fallbackPhone}).
                  </div>
                </div>
              </button>

              {/* Tier 4: Direct Tele-Triage Command */}
              <button
                type="button"
                onClick={() =>
                  triggerEscalation(
                    escalatingReq,
                    4,
                    "Solace Central Medical Director Tele-Triage Hotline",
                  )
                }
                className="w-full text-left p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] hover:border-emerald-500/40 transition-all flex items-start gap-2.5"
              >
                <span className="text-base">👨‍⚕️</span>
                <div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-300">
                    Tier 4: Clinical Command Tele-Triage
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    Connect bystander/caller directly to emergency physician tele-consultant.
                  </div>
                </div>
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

