"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Driver, EmergencyRequest, TransitionRule } from "@/lib/types";
import { formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

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
}: {
  drivers: Driver[];
  requests: EmergencyRequest[];
  rules: TransitionRule[];
  initialDriverId?: string | null;
  isDriverRole?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    if (isDriverRole && initialDriverId) return initialDriverId;
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

  function handleSelectDriver(id: string) {
    setSelectedDriverId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("ops_active_driver_id", id);
    }
  }

  // Live Realtime listener
  useEffect(() => {
    const channel = supabase
      .channel("driver-console-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
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
  }, [supabase, router]);

  useEffect(() => {
    if (initialRequests.length > prevCountRef.current) {
      playDispatchChime();
    }
    prevCountRef.current = initialRequests.length;
  }, [initialRequests.length]);

  const currentDriver = drivers.find((d) => d.id === selectedDriverId);

  // If driver role, ONLY show requests passed from server (strictly filtered)
  const assignedRequests = isDriverRole
    ? initialRequests
    : selectedDriverId
    ? initialRequests.filter((r) => r.driver_id === selectedDriverId)
    : initialRequests;

  // Stream GPS Telemetry via Supabase Realtime
  useEffect(() => {
    if (!navigator.geolocation || !selectedDriverId) return;

    const locChannel = supabase.channel("responder_locations");
    locChannel.subscribe();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const payload = {
          driver_id: selectedDriverId,
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

        locChannel.send({
          type: "broadcast",
          event: "location_update",
          payload,
        });
      },
      (err) => {
        setGpsError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      supabase.removeChannel(locChannel);
    };
  }, [supabase, selectedDriverId, currentDriver]);

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
      {/* Unit Selector & Duty Status */}
      <div className="card p-4 bg-slate-900 text-white border-slate-800">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Active Responder Unit
            </span>
            <div className="text-base font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span>🚑</span>
              <span>{currentDriver?.display_name || "Select Vehicle Unit"}</span>
              {currentDriver?.vehicle_label && (
                <span className="text-xs text-slate-300 font-normal">
                  ({currentDriver.vehicle_label})
                </span>
              )}
            </div>
          </div>

          {/* Unit selector only shown to Admin, hidden for real drivers */}
          {!isDriverRole && (
            <div className="flex items-center gap-2">
              <select
                className="select text-xs bg-slate-800 text-white border-slate-700 py-1.5"
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
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
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
                ? `GPS Telemetry Live (${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)})`
                : gpsError
                ? `GPS Offline (${gpsError})`
                : "Acquiring GPS Signal…"}
            </span>
          </div>
          {gpsCoords?.speed != null && (
            <span className="font-mono text-slate-300">
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
            No active emergency calls assigned to this unit right now.
          </p>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ● GPS & Radio live • Audio siren alert enabled
          </div>
        </div>
      )}

      {/* Assigned Emergency Cards */}
      {assignedRequests.map((r) => {
        const gmapsPatientUrl =
          r.patient_lat != null && r.patient_lng != null
            ? `https://www.google.com/maps/dir/?api=1&destination=${r.patient_lat},${r.patient_lng}`
            : r.patient_address
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                r.patient_address,
              )}`
            : null;

        const wazePatientUrl =
          r.patient_lat != null && r.patient_lng != null
            ? `https://waze.com/ul?ll=${r.patient_lat},${r.patient_lng}&navigate=yes`
            : null;

        const gmapsHospitalUrl =
          r.hospital?.lat != null && r.hospital?.lng != null
            ? `https://www.google.com/maps/dir/?api=1&destination=${r.hospital.lat},${r.hospital.lng}`
            : r.hospital?.address
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                r.hospital.address + ", " + r.hospital.name,
              )}`
            : r.hospital?.name
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                r.hospital.name,
              )}`
            : null;

        const wazeHospitalUrl =
          r.hospital?.lat != null && r.hospital?.lng != null
            ? `https://waze.com/ul?ll=${r.hospital.lat},${r.hospital.lng}&navigate=yes`
            : null;

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

            <div className="p-3.5 rounded-lg bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">
                  Patient Location
                </span>
                <p className="text-sm font-semibold mt-0.5">{formatLocation(r)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {r.patient_age_band && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    Age: {r.patient_age_band === "unknown" ? "Unknown" : `${r.patient_age_band} yrs`}
                  </span>
                )}
                {r.priority && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                    Priority {r.priority}
                  </span>
                )}
                {r.contact_phone && (
                  <a
                    href={`tel:${r.contact_phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                  >
                    <span>📞</span>
                    <span>Call Patient ({r.contact_phone})</span>
                  </a>
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
              )}
            </div>

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
                    <span>4. Arrived at Hospital / Initiate Intake</span>
                  </button>
                )}

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