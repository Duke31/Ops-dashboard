"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Driver, EmergencyRequest, TransitionRule } from "@/lib/types";
import { formatLocation, resolvePatientAgeBand } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

// Web Audio API siren alert for high-priority dispatch
function playDispatchChime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(660, now + 0.15);
    osc.frequency.setValueAtTime(880, now + 0.3);
    osc.frequency.setValueAtTime(660, now + 0.45);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  } catch {
    // Ignore audio restrictions
  }
}

function getGoogleMapsPatientUrl(r: EmergencyRequest): string | null {
  if (r.patient_lat != null && r.patient_lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${r.patient_lat},${r.patient_lng}`;
  }
  if (r.patient_address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.patient_address)}`;
  }
  return null;
}

function getWazePatientUrl(r: EmergencyRequest): string | null {
  if (r.patient_lat != null && r.patient_lng != null) {
    return `https://waze.com/ul?ll=${r.patient_lat},${r.patient_lng}&navigate=yes`;
  }
  return null;
}

function getGoogleMapsHospitalUrl(r: EmergencyRequest): string | null {
  if (r.hospital?.lat != null && r.hospital?.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${r.hospital.lat},${r.hospital.lng}`;
  }
  if (r.hospital?.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${r.hospital.address}, ${r.hospital.name}`,
    )}`;
  }
  if (r.hospital?.name) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.hospital.name)}`;
  }
  return null;
}

function getWazeHospitalUrl(r: EmergencyRequest): string | null {
  if (r.hospital?.lat != null && r.hospital?.lng != null) {
    return `https://waze.com/ul?ll=${r.hospital.lat},${r.hospital.lng}&navigate=yes`;
  }
  return null;
}

export function DriverConsole({
  drivers,
  requests: initialRequests,
  rules,
  initialDriverId,
  isDriverRole = false,
  activeDriverRecord,
}: {
  drivers: Driver[];
  requests: EmergencyRequest[];
  rules: TransitionRule[];
  initialDriverId?: string | null;
  isDriverRole?: boolean;
  activeDriverRecord?: Driver | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // For drivers, ALWAYS use initialDriverId (NEVER read from localStorage)
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    if (isDriverRole) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ops_active_driver_id");
      }
      return initialDriverId || "";
    }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ops_active_driver_id");
      if (stored) return stored;
    }
    return initialDriverId || drivers[0]?.id || "";
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const prevCountRef = useRef(initialRequests.length);

  // GPS Telemetry State
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // If initialDriverId changes or resolves, update state
  useEffect(() => {
    if (isDriverRole && initialDriverId) {
      setSelectedDriverId(initialDriverId);
    }
  }, [isDriverRole, initialDriverId]);

  function handleSelectDriver(id: string) {
    if (isDriverRole) return;
    setSelectedDriverId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("ops_active_driver_id", id);
    }
  }

  // Active driver metadata
  const currentDriver =
    (isDriverRole ? activeDriverRecord : null) ||
    drivers.find((d) => d.id === selectedDriverId) ||
    activeDriverRecord;

  // STRICT FILTER: If logged in as driver, filter ONLY requests assigned to this driver ID
  const assignedRequests = isDriverRole
    ? initialRequests.filter((r) => r.driver_id === (initialDriverId || currentDriver?.id))
    : selectedDriverId
    ? initialRequests.filter((r) => r.driver_id === selectedDriverId)
    : initialRequests;

  // Real-time listener for emergency request updates
  useEffect(() => {
    const channel = supabase
      .channel("driver-console-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        (payload) => {
          const rec = (payload.new || {}) as Record<string, unknown>;
          const targetDriver = isDriverRole ? (initialDriverId || currentDriver?.id) : selectedDriverId;
          
          if (
            (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
            targetDriver &&
            rec.driver_id === targetDriver
          ) {
            playDispatchChime();
          }
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
  }, [supabase, router, isDriverRole, initialDriverId, selectedDriverId, currentDriver?.id]);

  useEffect(() => {
    if (assignedRequests.length > prevCountRef.current) {
      playDispatchChime();
    }
    prevCountRef.current = assignedRequests.length;
  }, [assignedRequests.length]);

  // Keep reference to active assigned request IDs for live telemetry dispatch
  const activeRequestIdsRef = useRef<string[]>([]);
  useEffect(() => {
    activeRequestIdsRef.current = assignedRequests
      .filter((r) =>
        [
          "Driver assigned",
          "En route to patient",
          "Patient picked up",
          "En route to hospital",
        ].includes(r.status),
      )
      .map((r) => r.id);
  }, [assignedRequests]);

  const lastDbUpdateRef = useRef<number>(0);

  // Stream GPS Telemetry with immediate initial position fetch & continuous watching
  useEffect(() => {
    const driverIdToStream = isDriverRole ? (initialDriverId || currentDriver?.id) : selectedDriverId;
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsError("Geolocation not supported by browser");
      return;
    }
    if (!driverIdToStream) {
      setGpsError("Select a vehicle unit to start GPS");
      return;
    }

    // Channel for system-wide responders and request-specific tracking
    const locChannel = supabase.channel("responder_locations");
    locChannel.subscribe();

    // Map of subscribed request channels to avoid re-creating/unsubscribed sends
    const requestChannels = new Map<string, ReturnType<typeof supabase.channel>>();

    const updateLocation = (pos: GeolocationPosition) => {
      const payload = {
        driver_id: driverIdToStream,
        driver_name: currentDriver?.display_name || "Ambulance Unit",
        vehicle_label: currentDriver?.vehicle_label || null,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        accuracy: pos.coords.accuracy,
        updated_at: new Date().toISOString(),
      };

      setGpsCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        accuracy: pos.coords.accuracy,
      });
      setGpsError(null);

      // 1. Broadcast to system-wide responder channel
      locChannel.send({
        type: "broadcast",
        event: "location_update",
        payload,
      });

      // 2. Broadcast to specific request tracking channels for patient mobile app
      activeRequestIdsRef.current.forEach((reqId) => {
        let reqChan = requestChannels.get(reqId);
        if (!reqChan) {
          reqChan = supabase.channel(`request-tracking:${reqId}`);
          reqChan.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              reqChan?.send({
                type: "broadcast",
                event: "location_update",
                payload: { ...payload, request_id: reqId },
              });
            }
          });
          requestChannels.set(reqId, reqChan);
        } else {
          reqChan.send({
            type: "broadcast",
            event: "location_update",
            payload: { ...payload, request_id: reqId },
          });
        }
      });

      // 3. Throttled DB write: persist coordinate directly to drivers table every 3s
      const now = Date.now();
      if (now - lastDbUpdateRef.current >= 3000) {
        lastDbUpdateRef.current = now;

        // Try direct update first
        supabase
          .from("drivers")
          .update({
            current_lat: pos.coords.latitude,
            current_lng: pos.coords.longitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            last_location_at: new Date().toISOString(),
          })
          .eq("id", driverIdToStream)
          .then(({ error: updateErr }) => {
            if (updateErr) {
              // Fallback to RPC if RLS blocks direct update
              supabase
                .rpc("update_driver_location", {
                  p_driver_id: driverIdToStream,
                  p_lat: pos.coords.latitude,
                  p_lng: pos.coords.longitude,
                  p_heading: pos.coords.heading,
                  p_speed: pos.coords.speed,
                })
                .then(() => {});
            }
          });
      }
    };

    const handleLocationError = (err: GeolocationPositionError) => {
      let msg = err.message;
      if (err.code === 1) {
        msg = "GPS permission denied. Please allow location access in your browser settings.";
      } else if (err.code === 2) {
        msg = "Location unavailable. Check device GPS.";
      } else if (err.code === 3) {
        msg = "Location request timed out. Retrying…";
      }
      setGpsError(msg);
    };

    // 1. Immediately request current position
    navigator.geolocation.getCurrentPosition(updateLocation, handleLocationError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000,
    });

    // 2. Watch continuously
    const watchId = navigator.geolocation.watchPosition(updateLocation, handleLocationError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
      supabase.removeChannel(locChannel);
    };
  }, [supabase, isDriverRole, initialDriverId, selectedDriverId, currentDriver]);

  async function executeTransition(requestId: string, nextStatus: string) {
    setBusy(requestId);
    setError(null);
    setOk(null);

    try {
      const { error: rpcErr } = await supabase.rpc("transition_emergency_state", {
        request_id: requestId,
        new_state: nextStatus,
        actor_role: "driver",
      });

      if (rpcErr) throw rpcErr;
      setOk(`Mission status updated: ${nextStatus}`);
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-12">
      {/* Unit Banner */}
      <div className="card p-4 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">
              Active Responder Unit
            </span>
            <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span>🚑</span>
              <span>{currentDriver?.display_name || "Ambulance Unit"}</span>
              {currentDriver?.vehicle_label && (
                <span className="text-xs text-[var(--muted)] font-normal">
                  ({currentDriver.vehicle_label})
                </span>
              )}
            </div>
          </div>

          {!isDriverRole && (
            <div className="flex items-center gap-2">
              <select
                className="select text-xs py-1.5"
                value={selectedDriverId}
                onChange={(e) => handleSelectDriver(e.target.value)}
              >
                <option value="">All Units (Testing)</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.display_name} {d.vehicle_label ? `· ${d.vehicle_label}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Live GPS Telemetry Indicator */}
        <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)]">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  gpsCoords ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  gpsCoords ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <span>
              {gpsCoords
                ? `GPS Telemetry Live (${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)})`
                : gpsError
                ? `GPS Notice: ${gpsError}`
                : "Acquiring GPS Fix…"}
            </span>
          </div>
          {gpsCoords?.speed != null && (
            <span className="font-mono text-[var(--foreground)] font-semibold">
              {(gpsCoords.speed * 3.6).toFixed(0)} km/h
            </span>
          )}
        </div>
      </div>

      {/* No active dispatches */}
      {assignedRequests.length === 0 && (
        <div className="card p-8 text-center space-y-3">
          <div className="text-4xl">🟢</div>
          <h2 className="text-base font-semibold">Ready for Dispatch</h2>
          <p className="text-sm text-[var(--muted)]">
            No active emergency calls assigned to your unit right now.
          </p>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ● GPS & Radio live • Audio siren alert enabled
          </div>
        </div>
      )}

      {/* Assigned Emergency Cards */}
      {assignedRequests.map((r) => {
        const gmapsPatientUrl = getGoogleMapsPatientUrl(r);
        const wazePatientUrl = getWazePatientUrl(r);
        const gmapsHospitalUrl = getGoogleMapsHospitalUrl(r);
        const wazeHospitalUrl = getWazeHospitalUrl(r);

        return (
          <article
            key={r.id}
            className="card p-5 border-2 border-red-500/40 shadow-lg space-y-4 bg-[var(--surface)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 tracking-wider uppercase block">
                  🚨 Active Emergency Call
                </span>
                <h3 className="text-xl font-bold mt-0.5">
                  {r.emergency_type || "Emergency"}
                </h3>
                <div className="text-xs text-[var(--muted)] mt-1">
                  Opened {timeSince(r.created_at)}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>

            {/* Patient & Location Details */}
            <div className="p-3.5 rounded-lg bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">
                  Patient Location & Landmark / Room #
                </span>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  📍 {formatLocation(r)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {r.contact_phone ? (
                  <a
                    href={`tel:${r.contact_phone}`}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all"
                  >
                    <span className="text-base">📞</span>
                    <span>Call Patient ({r.contact_phone})</span>
                  </a>
                ) : (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ No phone number provided
                  </span>
                )}

                {(() => {
                  const age = resolvePatientAgeBand(r);
                  return (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                      {age && age.toLowerCase() !== "unknown"
                        ? `Age: ${age}`
                        : age === "unknown"
                        ? "Age: Unknown"
                        : "Age: —"}
                    </span>
                  );
                })()}
                {r.priority && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                    Priority {r.priority}
                  </span>
                )}
              </div>
            </div>

            {r.notes && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border-2 border-red-500/30 text-red-950 dark:text-red-100 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">
                  <span>⚠️</span>
                  <span>Patient Triage & Medical ID Alert:</span>
                </div>
                <p className="text-xs font-medium whitespace-pre-wrap leading-relaxed">
                  {r.notes}
                </p>
              </div>
            )}

            {r.hospital && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
                <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between">
                  <span>🏥 Destination Hospital: {r.hospital.name}</span>
                  {r.hospital.available_capacity != null && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100">
                      {r.hospital.available_capacity} Beds Available
                    </span>
                  )}
                </div>
                {r.hospital.address && (
                  <p className="text-[var(--muted)]">{r.hospital.address}</p>
                )}
                {r.hospital.intake_phone && (
                  <div className="pt-1">
                    <a
                      href={`tel:${r.hospital.intake_phone}`}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>📞</span>
                      <span>Call Hospital ER Desk: {r.hospital.intake_phone}</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Turn-by-Turn Navigation */}
            {r.status !== "Arrived / intake" && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                  Turn-by-Turn Navigation
                </span>

                {gmapsPatientUrl && (
                  <div className="flex gap-2">
                    <a
                      href={gmapsPatientUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <span>🗺️</span>
                      <span>Google Maps to Patient</span>
                    </a>
                    {wazePatientUrl && (
                      <a
                        href={wazePatientUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn py-2.5 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center gap-1"
                      >
                        <span>🚗</span>
                        <span>Waze</span>
                      </a>
                    )}
                  </div>
                )}

                {gmapsHospitalUrl && (
                  <div className="flex gap-2">
                    <a
                      href={gmapsHospitalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn py-2.5 text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>🏥</span>
                      <span>Google Maps to Hospital</span>
                    </a>
                    {wazeHospitalUrl && (
                      <a
                        href={wazeHospitalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn py-2.5 px-3 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white dark:bg-cyan-800 dark:hover:bg-cyan-700 rounded-lg flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span>🚗</span>
                        <span>Waze</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mission Milestone Buttons */}
            <div className="pt-3 border-t border-[var(--border,#e2e8f0)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                Mission Milestones
              </span>

              <div className="grid grid-cols-1 gap-2">
                {r.status === "Driver assigned" && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => executeTransition(r.id, "En route to patient")}
                    className="btn py-3.5 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>🚨</span>
                    <span>1. Accept & En Route to Patient</span>
                  </button>
                )}

                {r.status === "En route to patient" && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => executeTransition(r.id, "Patient picked up")}
                    className="btn py-3.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>📍</span>
                    <span>2. Arrived at Scene & Patient Loaded</span>
                  </button>
                )}

                {r.status === "Patient picked up" && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => executeTransition(r.id, "En route to hospital")}
                    className="btn py-3.5 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>🚑</span>
                    <span>3. En Route to Hospital</span>
                  </button>
                )}

                {r.status === "En route to hospital" && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => executeTransition(r.id, "Arrived / intake")}
                    className="btn py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>🏥</span>
                    <span>4. Arrived at Hospital / Hand Over to ER Staff</span>
                  </button>
                )}

                {/* Handover Completed Confirmation Banner for Drivers */}
                {r.status === "Arrived / intake" && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border-2 border-emerald-500/30 text-center space-y-2">
                    <div className="text-3xl">✅</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      Patient Successfully Delivered to Hospital
                    </div>
                    <p className="text-xs text-[var(--muted)] leading-relaxed">
                      Handover completed at the ER triage desk. The hospital staff is currently assigning a bed. Your unit is marked available for new dispatches.
                    </p>
                  </div>
                )}

                {r.status !== "Arrived / intake" && (
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => {
                      if (confirm("Are you sure you need to abort this dispatch?")) {
                        executeTransition(r.id, "Cancelled / failed");
                      }
                    }}
                    className="btn py-2 text-xs border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                  >
                    Report Unable to Complete / Abort
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}

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
    </div>
  );
}

export default DriverConsole;
