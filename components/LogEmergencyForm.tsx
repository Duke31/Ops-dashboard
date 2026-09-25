"use client";

import { FormEvent, useRef, useState } from "react";
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

const AGE_BANDS = ["unknown", "infant", "child", "adult", "older_adult"] as const;

export function LogEmergencyForm() {
  const router = useRouter();
  const supabase = createClient();
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
          p_patient_address: form.patient_address.trim(),
          p_patient_lat: Number(form.patient_lat),
          p_patient_lng: Number(form.patient_lng),
          p_emergency_type: form.emergency_type,
          p_priority: Number(form.priority),
          p_notes: form.notes.trim() || null,
          p_contact_phone: form.contact_phone.trim() || null,
          p_patient_age_band: form.patient_age_band,
        },
      );
      if (err) throw err;
      const created = Array.isArray(data) ? data[0] : data;
      const id =
        created && typeof created === "object" && "id" in created
          ? String((created as { id: string }).id)
          : null;
      setOk(id ? `Logged request ${id}.` : "Emergency logged.");
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
      className="card p-4 grid md:grid-cols-2 gap-3 mb-6"
    >
      <div className="md:col-span-2">
        <div className="text-sm font-semibold">Log new emergency</div>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          Phoned-in staff log. create_emergency_request sets origin and
          reporter from your session.
        </p>
      </div>
      <input
        className="input md:col-span-2"
        placeholder="Patient address"
        value={form.patient_address}
        onChange={(e) =>
          setForm({ ...form, patient_address: e.target.value })
        }
        required
      />
      <input
        className="input"
        placeholder="Latitude"
        inputMode="decimal"
        value={form.patient_lat}
        onChange={(e) => setForm({ ...form, patient_lat: e.target.value })}
        required
      />
      <input
        className="input"
        placeholder="Longitude"
        inputMode="decimal"
        value={form.patient_lng}
        onChange={(e) => setForm({ ...form, patient_lng: e.target.value })}
        required
      />
      <select
        className="select"
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
      <select
        className="select"
        value={form.priority}
        onChange={(e) => setForm({ ...form, priority: e.target.value })}
      >
        <option value="1">Priority 1</option>
        <option value="2">Priority 2</option>
        <option value="3">Priority 3</option>
      </select>
      <select
        className="select"
        value={form.patient_age_band}
        onChange={(e) =>
          setForm({ ...form, patient_age_band: e.target.value })
        }
      >
        {AGE_BANDS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <input
        className="input"
        placeholder="Contact phone (optional)"
        value={form.contact_phone}
        onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
      />
      <textarea
        className="input md:col-span-2 min-h-[72px]"
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />
      <div className="md:col-span-2">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Logging…" : "Log emergency"}
        </button>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </form>
  );
}
