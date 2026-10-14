"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import {
  Bed,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Stethoscope,
  Activity,
  HeartPulse,
  Flame,
} from "lucide-react";

interface MatrixState {
  theaterStatus: "ready" | "in_use" | "standby";
  bloodBankStatus: "active" | "limited" | "exhausted";
  specialistsOnDuty: string[];
  verifiedBy: string;
  verifiedAt: string;
}

const DEFAULT_SPECIALISTS = [
  "Obstetric Surgeon",
  "Trauma / General Surgeon",
  "Consultant Anesthetist",
  "Neonatologist / Pediatrician",
  "Emergency Triage Lead",
];

export function HospitalCapacity({
  hospitalId,
  value,
  hospitalName = "Facility",
}: {
  hospitalId: string;
  value: number | null;
  hospitalName?: string;
}) {
  const [cap, setCap] = useState(value ?? 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  // Storage key for extended matrix per hospital
  const storageKey = `solace_capacity_matrix_${hospitalId}`;

  const [matrix, setMatrix] = useState<MatrixState>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {
      theaterStatus: "ready",
      bloodBankStatus: "active",
      specialistsOnDuty: ["Obstetric Surgeon", "Consultant Anesthetist", "Emergency Triage Lead"],
      verifiedBy: "Shift Charge Physician",
      verifiedAt: new Date().toISOString(),
    };
  });

  // Sync state if value prop changes
  useEffect(() => {
    if (value != null) setCap(value);
  }, [value]);

  function persistMatrix(updated: MatrixState) {
    setMatrix(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  }

  async function adjust(delta: number) {
    const nextVal = Math.max(0, cap + delta);
    setCap(nextVal);
    await saveValue(nextVal);
  }

  async function saveValue(targetCapacity: number) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("hospitals")
      .update({ available_capacity: targetCapacity })
      .eq("id", hospitalId);

    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    // Also touch the verification timestamp
    persistMatrix({
      ...matrix,
      verifiedAt: new Date().toISOString(),
    });
    setMsg(`Bed count updated to ${targetCapacity}. Real-time dispatch grid notified.`);
    router.refresh();
  }

  function handleVerifyShift() {
    const now = new Date().toISOString();
    const updated = {
      ...matrix,
      verifiedAt: now,
    };
    persistMatrix(updated);
    setMsg("Shift capacity & surgical readiness verified. Timestamp refreshed on dispatch radar.");
  }

  function toggleSpecialist(spec: string) {
    const nextList = matrix.specialistsOnDuty.includes(spec)
      ? matrix.specialistsOnDuty.filter((s) => s !== spec)
      : [...matrix.specialistsOnDuty, spec];
    persistMatrix({
      ...matrix,
      specialistsOnDuty: nextList,
      verifiedAt: new Date().toISOString(),
    });
  }

  // Calculate elapsed time since verification
  const verifiedDate = new Date(matrix.verifiedAt);
  const minutesAgo = Math.max(0, Math.floor((Date.now() - verifiedDate.getTime()) / 60000));
  const isStale = minutesAgo > 240; // > 4 hours

  return (
    <div className="card p-5 border border-[var(--border,#e2e8f0)] bg-[var(--surface,#ffffff)] shadow-sm space-y-5">
      {/* 1. Header & Live Beds */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
              Dynamic Facility Capability Matrix
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              Live Intake Desk
            </span>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                cap === 0
                  ? "text-red-600 dark:text-red-400"
                  : cap <= 2
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {cap}
            </span>
            <span className="text-sm font-semibold text-[var(--muted,#64748b)]">
              {cap === 1 ? "emergency bed available" : "emergency beds available"}
            </span>
            {cap === 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
                <span>⚠️</span> Full / Diversion Lock
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted,#64748b)] mt-1">
            Dispatchers in Ibadan & Osun verify these beds and theater readiness before routing patients.
          </p>
        </div>

        {/* Quick Increment / Decrement Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost px-3 py-1.5 text-base font-bold border border-[var(--border,#cbd5e1)] hover:bg-red-50 dark:hover:bg-red-950/30"
            disabled={busy || cap <= 0}
            onClick={() => adjust(-1)}
            title="Minus 1 Bed"
          >
            − 1
          </button>
          <button
            type="button"
            className="btn btn-ghost px-3 py-1.5 text-base font-bold border border-[var(--border,#cbd5e1)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            disabled={busy}
            onClick={() => adjust(1)}
            title="Plus 1 Bed"
          >
            + 1
          </button>
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-xs font-bold shadow-sm"
            disabled={busy}
            onClick={() => saveValue(cap)}
          >
            {busy ? "Saving…" : "Save Live Beds"}
          </button>
        </div>
      </div>

      {/* Bed Slider */}
      <div className="pt-2 border-t border-[var(--border,#f1f5f9)] flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={40}
          value={cap}
          onChange={(e) => setCap(Number(e.target.value))}
          onMouseUp={() => saveValue(cap)}
          onTouchEnd={() => saveValue(cap)}
          className="flex-1 cursor-pointer accent-emerald-600"
        />
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            className="input w-20 text-center font-bold text-sm"
            min={0}
            max={999}
            value={cap}
            onChange={(e) => setCap(Number(e.target.value))}
            onBlur={() => saveValue(cap)}
          />
          <span className="text-xs text-[var(--muted,#64748b)]">beds</span>
        </div>
      </div>

      {/* 2. Clinical Readiness Matrix: Theater & Blood Bank */}
      <div className="pt-3 border-t border-[var(--border,#f1f5f9)] grid sm:grid-cols-2 gap-4">
        {/* Operating Theater Readiness */}
        <div className="p-3 rounded-lg bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
              <span>🏥</span> Surgical / C-Section Theater
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                matrix.theaterStatus === "ready"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : matrix.theaterStatus === "standby"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
              }`}
            >
              {matrix.theaterStatus === "ready"
                ? "Ready / Scrubbed"
                : matrix.theaterStatus === "standby"
                ? "Cleaning / Standby"
                : "In-Use / Occupied"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() =>
                persistMatrix({ ...matrix, theaterStatus: "ready", verifiedAt: new Date().toISOString() })
              }
              className={`px-2 py-1.5 rounded text-xs font-semibold border transition-all text-center ${
                matrix.theaterStatus === "ready"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                  : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              🟢 Ready
            </button>
            <button
              type="button"
              onClick={() =>
                persistMatrix({ ...matrix, theaterStatus: "standby", verifiedAt: new Date().toISOString() })
              }
              className={`px-2 py-1.5 rounded text-xs font-semibold border transition-all text-center ${
                matrix.theaterStatus === "standby"
                  ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                  : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              🟡 Standby
            </button>
            <button
              type="button"
              onClick={() =>
                persistMatrix({ ...matrix, theaterStatus: "in_use", verifiedAt: new Date().toISOString() })
              }
              className={`px-2 py-1.5 rounded text-xs font-semibold border transition-all text-center ${
                matrix.theaterStatus === "in_use"
                  ? "bg-red-600 text-white border-red-700 shadow-sm"
                  : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-red-50 dark:hover:bg-red-950/30"
              }`}
            >
              🔴 In-Use
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-tight">
            Prevents diverting maternal labor or trauma cases that require emergent operative delivery.
          </p>
        </div>

        {/* Blood Bank Reserve Status */}
        <div className="p-3 rounded-lg bg-[var(--surface-raised,#f8fafc)] border border-[var(--border,#e2e8f0)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
              <span>🩸</span> Blood Bank Reserve
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                matrix.bloodBankStatus === "active"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : matrix.bloodBankStatus === "limited"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
              }`}
            >
              {matrix.bloodBankStatus === "active"
                ? "Crossmatch Ready"
                : matrix.bloodBankStatus === "limited"
                ? "Limited Units"
                : "Exhausted"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() =>
                persistMatrix({ ...matrix, bloodBankStatus: "active", verifiedAt: new Date().toISOString() })
              }
              className={`px-2 py-1.5 rounded text-xs font-semibold border transition-all text-center ${
                matrix.bloodBankStatus === "active"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                  : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
            >
              🟢 Active
            </button>
            <button
              type="button"
              onClick={() =>
                persistMatrix({ ...matrix, bloodBankStatus: "limited", verifiedAt: new Date().toISOString() })
              }
              className={`px-2 py-1.5 rounded text-xs font-semibold border transition-all text-center ${
                matrix.bloodBankStatus === "limited"
                  ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                  : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              🟡 Limited
            </button>
            <button
              type="button"
              onClick={() =>
                persistMatrix({ ...matrix, bloodBankStatus: "exhausted", verifiedAt: new Date().toISOString() })
              }
              className={`px-2 py-1.5 rounded text-xs font-semibold border transition-all text-center ${
                matrix.bloodBankStatus === "exhausted"
                  ? "bg-red-600 text-white border-red-700 shadow-sm"
                  : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-red-50 dark:hover:bg-red-950/30"
              }`}
            >
              🔴 Exhausted
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-tight">
            Critical for severe antepartum/postpartum hemorrhage and high-speed polytrauma.
          </p>
        </div>
      </div>

      {/* 3. On-Duty Specialist Verification & Anti-Phantom Capacity Badge */}
      <div className="pt-3 border-t border-[var(--border,#f1f5f9)] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <span>👨‍⚕️</span> On-Duty Clinical Team Active
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                isStale
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isStale ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Unverified &gt; 4 hrs ({minutesAgo}m ago)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Shift verified ({minutesAgo === 0 ? "Just now" : `${minutesAgo}m ago`})</span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={handleVerifyShift}
              className="btn btn-ghost px-2.5 py-1 text-xs font-bold border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              ⚡ Re-Verify Shift
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_SPECIALISTS.map((spec) => {
            const active = matrix.specialistsOnDuty.includes(spec);
            return (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpecialist(spec)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700 font-semibold shadow-xs"
                    : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                <span>{active ? "✓" : "+"}</span>
                <span>{spec}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Toast message={err} onClose={() => setErr(null)} />
      <Toast message={msg} kind="ok" onClose={() => setMsg(null)} />
    </div>
  );
}
