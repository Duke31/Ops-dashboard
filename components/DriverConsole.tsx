"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Driver, EmergencyRequest, TransitionRule } from "@/lib/types";
import { formatLocation } from "@/lib/queries";
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

  // Determine active driver selection
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    if (isDriverRole && initialDriverId) return initialDriverId;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ops_active_driver_id");
      if (saved && drivers.some((d) => d.id === saved)) return saved;
    }
    return initialDriverId || drivers[0]?.id || "";
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const prevCountRef = useRef<number>(initialRequests.length);

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

    const locChannel = supabase.channel("responder_locations");
    locChannel.subscribe();

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
        const reqChannel = supabase.channel(`request-tracking:${reqId}`);
        reqChannel.send({
          type: "broadcast",
          event: "location_update",
          payload: {
            ...payload,
            request_id: reqId,
          },
        });
      });

      // 3. Throttled DB write: persist coordinate directly to drivers table every 5s
      const now = Date.now();
      if (now - lastDbUpdateRef.current >= 5000) {
        lastDbUpdateRef.current = now;
        supabase
          .rpc("update_driver_location", {
            p_driver_id: driverIdToStream,
            p_lat: pos.coords.latitude,
            p_lng: pos.coords.longitude,
            p_heading: pos.coords.heading,
            p_speed: pos.coords.speed,
          })
          .then(({ error: rpcErr }) => {
            if (rpcErr) {
              // Silently fallback if RPC not yet created in remote DB
              console.warn("Telemetry DB write error:", rpcErr.message);
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

      setOk(`Status updated to: ${nextStatus}`);
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Action failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Driver Unit Selector (Only shown if dispatcher/admin previewing, hidden for logged in driver) */}
      {!isDriverRole && (
        <div className="card p-4 bg-[var(--surface)] border border-[var(--border,#e2e8f0)] rounded-xl space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Select Active Ambulance / Driver Unit:
          </label>
          <select
            value={selectedDriverId}
            onChange={(e) => handleSelectDriver(e.target.value)}
            className="select w-full font-medium"
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name} {d.vehicle_label ? `(${d.vehicle_label})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Driver Identity Card & Live GPS Indicator */}
      <div className="card p-5 bg-slate-900 text-white border-0 shadow-lg rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-xl">
              🚑
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">
                {currentDriver?.display_name || "Emergency Responder"}
              </h2>
              <div className="text-xs text-slate-400">
                Unit: {currentDriver?.vehicle_label || "Rapid Response Vehicle"}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ON DUTY</span>
            </span>
          </div>
        </div>

        {/* GPS Live Telemetry Pill */}
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">📡</span>
            <div>
              <div className="font-semibold text-slate-200">
                {gpsCoords ? "Live GPS Connected" : "Acquiring GPS Signal…"}
              </div>
              {gpsCoords && (
                <div className="text-[11px] text-slate-400 font-mono">
                  {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                  {gpsCoords.speed != null && gpsCoords.speed > 0
                    ? ` • ${(gpsCoords.speed * 3.6).toFixed(0)} km/h`
                    : ""}
                </div>
              )}
            </div>
          </div>
          {gpsError && (
            <span className="text-[11px] text-amber-400 font-medium max-w-[200px] text-right">
              {gpsError}
            </span>
          )}
        </div>
      </div>

      {/* Assigned Dispatches List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Active Dispatches ({assignedRequests.length})
          </h3>
          <span className="text-xs text-[var(--muted)]">Auto-syncing every 4s</span>
        </div>

        {assignedRequests.length === 0 ? (
          <div className="card p-10 text-center space-y-3 bg-[var(--surface)] border border-dashed border-[var(--border,#cbd5e1)] rounded-2xl">
            <div className="text-4xl">📻</div>
            <div className="font-bold text-base">All quiet on your radio</div>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              You currently have no emergency dispatches assigned. Stay close to your vehicle and keep your GPS active.
            </p>
          </div>
        ) : (
          assignedRequests.map((r) => {
            // Destination navigation coordinates
            const patientLat = r.patient_lat;
            const patientLng = r.patient_lng;
            const hospitalLat = r.hospital?.lat;
            const hospitalLng = r.hospital?.lng;

            const gmapsPatientUrl =
              patientLat && patientLng
                ? `https://www.google.com/maps/dir/?api=1&destination=${patientLat},${patientLng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    r.patient_address || "",
                  )}`;

            const wazePatientUrl =
              patientLat && patientLng
                ? `https://waze.com/ul?ll=${patientLat},${patientLng}&navigate=yes`
                : null;

            const gmapsHospitalUrl =
              hospitalLat && hospitalLng
                ? `https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}`
                : r.hospital?.name
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    r.hospital.name + " hospital",
                  )}`;

            const wazeHospitalUrl =
              hospitalLat && hospitalLng
                ? `https://waze.com/ul?ll=${hospitalLat},${hospitalLng}&navigate=yes`
                : null;

            return (
              <div
                key={r.id}
                className="card p-5 bg-[var(--surface)] border-2 border-red-500/30 rounded-2xl shadow-md space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                        {r.priority ? `Priority ${r.priority}` : "Emergency"}
                      </span>
                      <span className="font-bold text-base">{r.emergency_type || "Emergency"}</span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      Assigned {timeSince(r.created_at)}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* Patient Location & Contact Box */}
                <div className="p-3.5 rounded-xl bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-base text-red-600">📍</span>
                    <div>
                      <div className="font-bold text-sm text-[var(--foreground)]">
                        {formatLocation(r)}
                      </div>
                      {r.patient_address && (
                        <div className="text-xs text-[var(--muted)] mt-0.5">
                          {r.patient_address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border,#e2e8f0)]">
                    {r.contact_phone && (
                      <a
                        href={`tel:${r.contact_phone}`}
                        className="btn py-1.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5"
                      >
                        <span>📞</span>
                        <span>Call Patient ({r.contact_phone})</span>
                      </a>
                    )}
                    {r.patient_age_band && (
                      <span className="px-2 py-1 rounded bg-[var(--surface)] border text-[var(--muted)] font-medium">
                        Age: {r.patient_age_band === "unknown" ? "Unknown" : `${r.patient_age_band} yrs`}
                      </span>
                    )}
                  </div>

                  {r.notes && (
                    <div className="mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200">
                      <strong className="block text-[10px] uppercase tracking-wider mb-0.5">
                        Clinical & Dispatch Notes:
                      </strong>
                      <p className="whitespace-pre-wrap leading-relaxed">{r.notes}</p>
                    </div>
                  )}
                </div>

                {/* Turn-by-Turn Navigation Launchers (Stage 1: To Patient) */}
                {(r.status === "Driver assigned" || r.status === "En route to patient") && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                      Launch Turn-by-Turn Navigation to Scene:
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={gmapsPatientUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>🗺️</span>
                        <span>Google Maps to Patient</span>
                      </a>
                      {wazePatientUrl && (
                        <a
                          href={wazePatientUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn py-2.5 px-3 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg flex items-center justify-center gap-1"
                        >
                          <span>🚗</span>
                          <span>Waze</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Turn-by-Turn Navigation Launchers (Stage 2: To Receiving Hospital) */}
                {(r.status === "Patient picked up" || r.status === "En route to hospital") && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                      Receiving Hospital Navigation:
                    </span>
                    <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 mb-2">
                      <strong>Destination:</strong> {r.hospital?.name || "Designated Emergency Hospital"}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={gmapsHospitalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn py-2.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center gap-1.5"
                      >
                        <span>🏥</span>
                        <span>Google Maps to Hospital</span>
                      </a>
                      {wazeHospitalUrl && (
                        <a
                          href={wazeHospitalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn py-2.5 px-3 text-xs font-semibold bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center gap-1"
                        >
                          <span>🚗</span>
                          <span>Waze</span>
                        </a>
                      )}
                    </div>
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
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}
      {ok && (
        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
          {ok}
        </div>
      )}
    </div>
  );
}