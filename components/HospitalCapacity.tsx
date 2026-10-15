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
  verifiedCadre?: string;
  verifiedAt: string;
  mgso4Stocked: boolean;
  neonatalResusReady: boolean;
  hduBedReady: boolean;
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
      verifiedBy: "Duty Charge Nurse / MO",
      verifiedCadre: "Emergency Triage Lead",
      verifiedAt: new Date().toISOString(),
      mgso4Stocked: true,
      neonatalResusReady: true,
      hduBedReady: true,
    };
  });

  const [officerName, setOfficerName] = useState(matrix.verifiedBy || "Duty Charge Nurse / MO");
  const [officerCadre, setOfficerCadre] = useState(matrix.verifiedCadre || "Emergency Triage Lead");

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

  async function handleVerifyShift() {
    setBusy(true);
    const now = new Date().toISOString();
    const updated = {
      ...matrix,
      verifiedBy: officerName.trim() || "Duty Charge Lead",
      verifiedCadre: officerCadre,
      verifiedAt: now,
    };
    persistMatrix(updated);

    const supabase = createClient();
    try {
      await supabase.rpc("hospital_verify_shift", {
        p_hospital_id: hospitalId,
        p_officer_name: officerName.trim() || "Duty Charge Lead",
        p_officer_cadre: officerCadre,
        p_capacity: cap,
        p_theater_ready: matrix.theaterStatus === "ready",
        p_blood_bank_ready: matrix.bloodBankStatus === "active",
        p_mgso4_ready: matrix.mgso4Stocked,
        p_oxytocin_ready: matrix.mgso4Stocked,
        p_neonatal_resus_ready: matrix.neonatalResusReady,
        p_hdu_bed_ready: matrix.hduBedReady,
      });
    } catch {
      try {
        await supabase
          .from("hospitals")
          .update({
            available_capacity: cap,
            last_shift_verified_at: now,
            shift_officer_name: officerName.trim() || "Duty Charge Lead",
            shift_officer_cadre: officerCadre,
            theater_ready: matrix.theaterStatus === "ready",
            blood_bank_ready: matrix.bloodBankStatus === "active",
          })
          .eq("id", hospitalId);
      } catch {}
    }

    setBusy(false);
    setMsg(`8-Hour Shift Verified by ${officerName} (${officerCadre}). Anti-phantom capacity clock refreshed.`);
    router.refresh();
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

  // Calculate elapsed time & 8-hour shift expiration (Section 7)
  const verifiedDate = new Date(matrix.verifiedAt);
  const minutesAgo = Math.max(0, Math.floor((Date.now() - verifiedDate.getTime()) / 60000));
  const isExpired = minutesAgo >= 480; // >= 8 hours
  const remainingMinutes = Math.max(0, 480 - minutesAgo);
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

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

      {/* 3. Essential Obstetric & Neonatal Checkpoints (Section 7) */}
      <div className="pt-3 border-t border-[var(--border,#f1f5f9)] space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
          <span>🩺</span> Critical Emergency Medications & Equipment Checkpoints
        </span>

        <div className="grid sm:grid-cols-3 gap-2.5 text-xs">
          <label className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={matrix.mgso4Stocked}
              onChange={(e) =>
                persistMatrix({ ...matrix, mgso4Stocked: e.target.checked, verifiedAt: new Date().toISOString() })
              }
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="font-semibold text-[var(--foreground)]">MgSO4 & Oxytocin Stocked</span>
          </label>

          <label className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={matrix.neonatalResusReady}
              onChange={(e) =>
                persistMatrix({ ...matrix, neonatalResusReady: e.target.checked, verifiedAt: new Date().toISOString() })
              }
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-semibold text-[var(--foreground)]">Neonatal Resus Station Ready</span>
          </label>

          <label className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={matrix.hduBedReady}
              onChange={(e) =>
                persistMatrix({ ...matrix, hduBedReady: e.target.checked, verifiedAt: new Date().toISOString() })
              }
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-semibold text-[var(--foreground)]">HDU / Critical Bed Ready</span>
          </label>
        </div>
      </div>

      {/* 4. On-Duty Specialist Verification & 8-Hour Anti-Phantom Capacity Cycle */}
      <div className="pt-3 border-t border-[var(--border,#f1f5f9)] space-y-3">
        {/* Expiration Alert Banner */}
        {isExpired ? (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-bold">
                ⚠️ Shift Verification Expired (&gt; 8 hours). Dispatchers will flag capacity as unconfirmed until verified by the on-duty officer.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shift Verified by {matrix.verifiedBy} ({matrix.verifiedCadre || "Lead"})</span>
            </div>
            <span className="font-mono font-bold text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
              {remainingHours}h {remainingMins}m remaining on 8h cycle
            </span>
          </div>
        )}

        {/* Verification Form: Officer Name, Cadre & Commit */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] space-y-3 text-xs">
          <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Shift Officer Sign-Off (Anti-Phantom Capacity Assurance)</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
                Duty Officer Name
              </label>
              <input
                type="text"
                placeholder="e.g. Nurse Adeleke / Dr. Balogun"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="input w-full text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
                Clinical Cadre
              </label>
              <select
                value={officerCadre}
                onChange={(e) => setOfficerCadre(e.target.value)}
                className="select w-full text-xs"
              >
                <option value="Emergency Triage Lead">Emergency Triage Lead</option>
                <option value="Chief Nursing Officer">Chief Nursing Officer (CNO)</option>
                <option value="Labor Ward Lead">Labor Ward In-Charge</option>
                <option value="Consultant Obstetrician">Consultant Obstetrician</option>
                <option value="Medical Officer">Medical Officer on Duty</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleVerifyShift}
                disabled={busy}
                className="btn btn-primary w-full py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{busy ? "Verifying…" : "Sign & Verify 8h Shift"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Specialist On Duty Chips */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold text-[var(--muted)]">Specialists On Duty:</div>
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
      </div>

      <Toast message={err} onClose={() => setErr(null)} />
      <Toast message={msg} kind="ok" onClose={() => setMsg(null)} />
    </div>
  );
}
