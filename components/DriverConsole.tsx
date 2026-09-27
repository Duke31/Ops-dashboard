"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Driver, EmergencyRequest, TransitionRule } from "@/lib/types";
import { formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

function triggerAlertTone() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "triangle";
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(600, t + 0.15);
    osc.frequency.setValueAtTime(800, t + 0.3);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.start(t);
    osc.stop(t + 0.5);
  } catch {
    // Audio context restricted before gesture
  }
}

export function DriverConsole({
  drivers,
  requests: initialRequests,
  initialDriverId,
  profileRole = "driver",
}: {
  drivers: Driver[];
  requests: EmergencyRequest[];
  rules: TransitionRule[];
  initialDriverId?: string | null;
  profileRole?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("active_unit_driver_id");
      if (saved) return saved;
    }
    return initialDriverId || drivers[0]?.id || "";
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const prevCount = useRef(initialRequests.length);

  function changeDriverUnit(id: string) {
    setSelectedDriverId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_unit_driver_id", id);
    }
  }

  useEffect(() => {
    const ch = supabase
      .channel("driver-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        () => {
          triggerAlertTone();
          router.refresh();
        },
      )
      .subscribe();

    const timer = setInterval(() => {
      router.refresh();
    }, 4000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(timer);
    };
  }, [supabase, router]);

  useEffect(() => {
    if (initialRequests.length > prevCount.current) {
      triggerAlertTone();
    }
    prevCount.current = initialRequests.length;
  }, [initialRequests.length]);

  const activeDriver = drivers.find((d) => d.id === selectedDriverId);

  const activeRequests = selectedDriverId
    ? initialRequests.filter((r) => r.driver_id === selectedDriverId)
    : initialRequests;

  async function updateStatus(requestId: string, targetState: string) {
    setBusy(requestId);
    setError(null);
    setOk(null);

    try {
      const effectiveRole = profileRole === "admin" ? "admin" : "driver";

      const { error: err } = await supabase.rpc("transition_emergency_state", {
        request_id: requestId,
        new_state: targetState,
        actor_role: effectiveRole,
      });

      if (err) throw err;
      setOk(`Status moved to "${targetState}"`);
      router.refresh();
    } catch (e: unknown) {
      setError(rpcMessage(e) || "Could not update status.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-12">
      {/* Unit Selection Header */}
      <div className="card p-4 bg-slate-900 text-white border-slate-800">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Active Ambulance Unit
            </span>
            <div className="text-base font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span>🚑</span>
              <span>{activeDriver?.display_name || "Select Vehicle Unit"}</span>
              {activeDriver?.vehicle_label && (
                <span className="text-xs text-slate-300 font-normal">
                  ({activeDriver.vehicle_label})
                </span>
              )}
            </div>
          </div>

          <select
            className="select text-xs bg-slate-800 text-white border-slate-700 py-1.5"
            value={selectedDriverId}
            onChange={(e) => changeDriverUnit(e.target.value)}
          >
            <option value="">All Units (Testing)</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name} {d.vehicle_label ? `· ${d.vehicle_label}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {activeRequests.length === 0 && (
        <div className="card p-8 text-center space-y-3">
          <div className="text-4xl">🟢</div>
          <h2 className="text-base font-semibold">Ready for Dispatch</h2>
          <p className="text-sm text-[var(--muted)]">
            No active emergency calls assigned to this unit.
          </p>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ● Audio alert active • GPS ready
          </div>
        </div>
      )}

      {/* Active Emergency Requests */}
      {activeRequests.map((r) => {
        const isArrived = r.status === "Arrived / intake";
        const isCompleted = r.status === "Completed" || r.status === "Cancelled / failed";

        const patientMapUrl =
          r.patient_lat != null && r.patient_lng != null
            ? `https://www.google.com/maps/dir/?api=1&destination=${Number(r.patient_lat).toFixed(6)},${Number(r.patient_lng).toFixed(6)}&travelmode=driving`
            : r.patient_address
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.patient_address)}&travelmode=driving`
            : null;

        const hospitalMapUrl =
          r.hospital?.lat != null && r.hospital?.lng != null
            ? `https://www.google.com/maps/dir/?api=1&destination=${Number(r.hospital.lat).toFixed(6)},${Number(r.hospital.lng).toFixed(6)}&travelmode=driving`
            : r.hospital?.address
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                r.hospital.address + ", " + r.hospital.name,
              )}&travelmode=driving`
            : r.hospital?.name
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.hospital.name)}&travelmode=driving`
            : null;

        return (
          <article
            key={r.id}
            className={`card p-5 border-2 shadow-lg space-y-4 bg-[var(--surface)] ${
              isArrived ? "border-emerald-500/50" : "border-red-500/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`text-[11px] font-bold tracking-wider uppercase block ${
                  isArrived ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {isArrived ? "🏥 Handover In Progress" : "🚨 Active Emergency Call"}
                </span>
                <h3 className="text-xl font-bold mt-0.5">{r.emergency_type || "Emergency"}</h3>
                <div className="text-xs text-[var(--muted)] mt-1">
                  Opened {timeSince(r.created_at)}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>

            {/* Patient & Location */}
            <div className="p-3.5 rounded-lg bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)] block">
                  Patient Location
                </span>
                <p className="text-sm font-semibold mt-0.5">{formatLocation(r)}</p>
                {r.patient_lat != null && r.patient_lng != null && (
                  <span className="text-[11px] text-[var(--muted)] block font-mono">
                    GPS: {Number(r.patient_lat).toFixed(5)}, {Number(r.patient_lng).toFixed(5)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {r.patient_age_band && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    Age: {r.patient_age_band === "unknown" ? "Unknown" : `${r.patient_age_band} yrs`}
                  </span>
                )}
                {r.contact_phone && (
                  <a
                    href={`tel:${r.contact_phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-emerald-600 text-white shadow-sm"
                  >
                    <span>📞 Call Patient: {r.contact_phone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Medical ID Notes */}
            {r.notes && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-red-700 dark:text-red-400 block">
                  Clinical Triage & Medical ID
                </span>
                <p className="text-xs font-medium whitespace-pre-wrap">{r.notes}</p>
              </div>
            )}

            {/* Receiving Hospital */}
            {r.hospital && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                    Assigned Receiving Hospital
                  </span>
                  {r.hospital.available_capacity != null && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      Capacity: {r.hospital.available_capacity} beds
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold">{r.hospital.name}</p>
                {hospitalMapUrl && (
                  <a
                    href={hospitalMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn text-xs py-1 px-3 border border-slate-300 dark:border-slate-600 inline-flex items-center gap-1.5"
                  >
                    <span>🏥 Route to Hospital</span>
                  </a>
                )}
              </div>
            )}

            {/* Turn-by-Turn GPS Button (hidden once arrived at hospital) */}
            {patientMapUrl && !isArrived && (
              <a
                href={patientMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-center flex items-center justify-center gap-2 rounded-lg"
              >
                <span>🗺️ Open Turn-by-Turn GPS to Patient</span>
              </a>
            )}

            {/* Mission Status Workflow */}
            <div className="pt-2 border-t border-[var(--border,#e2e8f0)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                Mission Status
              </span>

              {/* State 1: En Route to Patient */}
              {r.status === "Driver assigned" && (
                <button
                  disabled={busy === r.id}
                  onClick={() => updateStatus(r.id, "En route to patient")}
                  className="w-full btn py-3 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <span>🚑 En Route to Patient</span>
                </button>
              )}

              {/* State 2: Patient Picked Up */}
              {r.status === "En route to patient" && (
                <button
                  disabled={busy === r.id}
                  onClick={() => updateStatus(r.id, "Patient picked up")}
                  className="w-full btn py-3 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <span>📍 Patient Picked Up</span>
                </button>
              )}

              {/* State 3: En Route to Hospital */}
              {r.status === "Patient picked up" && (
                <button
                  disabled={busy === r.id}
                  onClick={() => updateStatus(r.id, "En route to hospital")}
                  className="w-full btn py-3 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <span>🏥 En Route to Hospital</span>
                </button>
              )}

              {/* State 4: Arrived / Intake Handover */}
              {r.status === "En route to hospital" && (
                <button
                  disabled={busy === r.id}
                  onClick={() => updateStatus(r.id, "Arrived / intake")}
                  className="w-full btn py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <span>✅ Arrived / Intake Handover</span>
                </button>
              )}

              {/* State 5: Arrived - Driver Handover Completed, awaiting hospital */}
              {isArrived && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center space-y-1">
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
                    <span>✅</span>
                    <span>Patient Handed Over to Hospital</span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Ambulance unit free for next dispatch. Hospital intake desk will mark case completed upon admission.
                  </p>
                </div>
              )}

              {/* Abort button ONLY available before reaching the hospital! */}
              {!isArrived && !isCompleted && (
                <button
                  disabled={busy === r.id}
                  onClick={() => {
                    if (confirm("Are you sure you need to abort this dispatch?")) {
                      updateStatus(r.id, "Cancelled / failed");
                    }
                  }}
                  className="w-full mt-2 btn py-2 text-xs border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                >
                  Report Unable to Complete / Abort
                </button>
              )}
            </div>
          </article>
        );
      })}

      <Toast message={error} kind="error" onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </div>
  );
}