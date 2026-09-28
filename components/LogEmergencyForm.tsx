"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";
import { rpcMessage } from "@/lib/rpc-error";

const TYPES = [
  "Trauma",
  "Cardiac",
  "Stroke",
  "Respiratory",
  "Obstetric",
  "Pediatric",
  "Psychiatric",
  "Other",
] as const;

const AGE_BANDS = ["unknown", "0-1", "2-12", "13-17", "18-39", "40-64", "65+"] as const;

export function LogEmergencyForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_address: "",
    patient_lat: "",
    patient_lng: "",
    emergency_type: "Trauma",
    priority: "2",
    notes: "",
    contact_phone: "",
    patient_age_band: "unknown",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { data, error: err } = await supabase.rpc(
        "create_emergency_request",
        {
          p_patient_lat: Number(form.patient_lat),
          p_patient_lng: Number(form.patient_lng),
          p_patient_address: form.patient_address.trim(),
          p_emergency_type: form.emergency_type,
          p_priority: Number(form.priority),
          p_notes: form.notes.trim() || null,
          p_contact_phone: form.contact_phone.trim() || null,
          p_patient_age_band: form.patient_age_band,
          p_idempotency_key: crypto.randomUUID(),
        },
      );
      if (err) throw err;
      const created = Array.isArray(data) ? data[0] : data;
      const id =
        created && typeof created === "object" && "id" in created
          ? String((created as { id: string }).id)
          : null;
      setOk(id ? `Logged emergency #${id.slice(0, 8)}.` : "Emergency logged.");
      setForm({
        patient_address: "",
        patient_lat: "",
        patient_lng: "",
        emergency_type: "Trauma",
        priority: "2",
        notes: "",
        contact_phone: "",
        patient_age_band: "unknown",
      });
      router.refresh();
    } catch (e) {
      setError(rpcMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card p-5 grid md:grid-cols-2 gap-3.5 mb-6 border border-[var(--border,#e2e8f0)] shadow-sm bg-[var(--surface)]"
    >
      <div className="md:col-span-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>🚨</span>
          <span>Log New Emergency Call</span>
        </h2>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          Intake form for phoned-in 112/999 calls or operator-assisted patient dispatches.
        </p>
      </div>

      <input
        className="input md:col-span-2"
        placeholder="Patient location, hostel name, or street landmark"
        value={form.patient_address}
        onChange={(e) =>
          setForm({ ...form, patient_address: e.target.value })
        }
        required
      />

      <input
        className="input"
        placeholder="Patient Latitude (e.g. 8.1420)"
        inputMode="decimal"
        value={form.patient_lat}
        onChange={(e) => setForm({ ...form, patient_lat: e.target.value })}
        required
      />

      <input
        className="input"
        placeholder="Patient Longitude (e.g. 4.2510)"
        inputMode="decimal"
        value={form.patient_lng}
        onChange={(e) => setForm({ ...form, patient_lng: e.target.value })}
        required
      />

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
          Clinical Type
        </label>
        <select
          className="select w-full"
          value={form.emergency_type}
          onChange={(e) =>
            setForm({ ...form, emergency_type: e.target.value })
          }
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
          Triage Priority
        </label>
        <select
          className="select w-full"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          <option value="1">Priority 1 (Immediate / Life Threat)</option>
          <option value="2">Priority 2 (Urgent / Serious)</option>
          <option value="3">Priority 3 (Delayed / Stable)</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
          Patient Age Band
        </label>
        <select
          className="select w-full"
          value={form.patient_age_band}
          onChange={(e) =>
            setForm({ ...form, patient_age_band: e.target.value })
          }
        >
          {AGE_BANDS.map((a) => (
            <option key={a} value={a}>
              {a === "unknown" ? "Age Unknown" : `${a} years`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
          Contact Phone
        </label>
        <input
          className="input w-full"
          placeholder="Phone number of caller / patient"
          value={form.contact_phone}
          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
        />
      </div>

      <textarea
        className="input md:col-span-2 min-h-[76px]"
        placeholder="Clinical notes, symptoms, caller report, or medical ID details..."
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />

      <div className="md:col-span-2 pt-1">
        <button className="btn btn-primary py-2.5 px-6 font-bold" type="submit" disabled={busy}>
          {busy ? "Dispatching…" : "Open Emergency Mission"}
        </button>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </form>
  );
}