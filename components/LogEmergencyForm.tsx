"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";
import { rpcMessage } from "@/lib/rpc-error";
import {
  REGION_CLUSTERS,
  CLINICAL_SPECIALTIES,
  type RegionClusterKey,
} from "@/lib/regionClusters";
import {
  ShieldAlert,
  MapPin,
  Stethoscope,
  Activity,
  HeartPulse,
  Baby,
  Building2,
  FileText,
} from "lucide-react";

const TYPES = [
  "Obstetric",
  "Trauma",
  "Cardiac",
  "Pediatric",
  "Respiratory",
  "Stroke",
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

  const [cluster, setCluster] = useState<RegionClusterKey>("ibadan_private");
  const [emergencyType, setEmergencyType] = useState<string>("Obstetric");
  const [priority, setPriority] = useState<string>("1");
  const [ageBand, setAgeBand] = useState<string>("18-39");

  // Pre-fill location presets for rapid testing / dispatching
  const [address, setAddress] = useState("Queen Elizabeth Road, Bodija, Ibadan");
  const [lat, setLat] = useState("7.4042");
  const [lng, setLng] = useState("3.9036");
  const [contactPhone, setContactPhone] = useState("08035551212");

  // Clinical quick notes
  const [clinicalNotes, setClinicalNotes] = useState(
    "Active labor with severe headache and elevated BP. Pre-referral MgSO4 loading dose administered on scene.",
  );

  function handleClusterChange(newCluster: RegionClusterKey) {
    setCluster(newCluster);
    if (newCluster === "ibadan_private") {
      setAddress("Ring Road / Challenge Junction, Ibadan, Oyo State");
      setLat("7.3621");
      setLng("3.8642");
    } else if (newCluster === "osun_pilot") {
      setAddress("Hospital Road, Asubiaro, Osogbo, Osun State");
      setLat("7.7681");
      setLng("4.5512");
    } else if (newCluster === "lagos_metropolitan") {
      setAddress("14 Herbert Macaulay Way, Yaba, Lagos");
      setLat("6.5095");
      setLng("3.3711");
    }
  }

  function handleTypeChange(newType: string) {
    setEmergencyType(newType);
    const spec = CLINICAL_SPECIALTIES[newType];
    if (spec) {
      setPriority(String(spec.priorityDefault));
      setClinicalNotes(spec.sbarTemplates.situation);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setOk(null);

    try {
      const spec = CLINICAL_SPECIALTIES[emergencyType];
      const sbarSituation = clinicalNotes.trim() || spec?.sbarTemplates.situation || "Emergency intake requested";
      const sbarRecommendation = spec?.sbarTemplates.recommendation || "Immediate curb triage and bed preparation";

      // Formulate formatted notes with cluster tag and structured SBAR note
      const formattedNotes = `[CLUSTER: ${cluster}] [SBAR HANDOVER: S: ${sbarSituation} | B: Patient age band ${ageBand}, reported via Central Dispatch | A: Triage Priority ${priority} active transit | R: ${sbarRecommendation}]`;

      const { data, error: err } = await supabase.rpc("create_emergency_request", {
        p_patient_lat: Number(lat),
        p_patient_lng: Number(lng),
        p_patient_address: address.trim(),
        p_emergency_type: emergencyType,
        p_priority: Number(priority),
        p_notes: formattedNotes,
        p_contact_phone: contactPhone.trim() || null,
        p_patient_age_band: ageBand,
        p_idempotency_key: crypto.randomUUID(),
      });

      if (err) throw err;
      const created = Array.isArray(data) ? data[0] : data;
      const id =
        created && typeof created === "object" && "id" in created
          ? String((created as { id: string }).id)
          : null;

      setOk(
        id
          ? `Emergency logged for ${REGION_CLUSTERS[cluster === "all" ? "ibadan_private" : cluster].shortName} (ID: ${id.slice(0, 8)}).`
          : "Emergency successfully logged.",
      );

      router.refresh();
    } catch (e) {
      setError(rpcMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 mb-6 border border-[var(--border,#e2e8f0)] shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          <div className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Log Emergency Incident (Central Desk)</span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Routes immediately to the active regional cluster and alerts nearby ambulances.
          </p>
        </div>

        {/* Cluster Selector Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-[var(--muted)]">Cluster:</span>
          <button
            type="button"
            onClick={() => handleClusterChange("ibadan_private")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              cluster === "ibadan_private"
                ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                : "bg-[var(--surface-raised)] text-[var(--muted)] border-[var(--border)]"
            }`}
          >
            🏥 Ibadan Private
          </button>
          <button
            type="button"
            onClick={() => handleClusterChange("osun_pilot")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              cluster === "osun_pilot"
                ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                : "bg-[var(--surface-raised)] text-[var(--muted)] border-[var(--border)]"
            }`}
          >
            🏛️ Osun Pilot
          </button>
          <button
            type="button"
            onClick={() => handleClusterChange("lagos_metropolitan")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              cluster === "lagos_metropolitan"
                ? "bg-teal-600 text-white border-teal-700 shadow-xs"
                : "bg-[var(--surface-raised)] text-[var(--muted)] border-[var(--border)]"
            }`}
          >
            🌊 Lagos Metro
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <div className="md:col-span-2 space-y-1">
          <label className="font-bold text-[var(--foreground)]">Incident Address / Landmark</label>
          <input
            className="input text-xs w-full"
            placeholder="Street address or junction"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-[var(--foreground)]">Latitude</label>
          <input
            className="input text-xs"
            placeholder="Latitude"
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-[var(--foreground)]">Longitude</label>
          <input
            className="input text-xs"
            placeholder="Longitude"
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-[var(--foreground)]">Clinical Emergency Type</label>
          <select
            className="select text-xs"
            value={emergencyType}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "Obstetric"
                  ? "🟣 Obstetric & Maternal Labor (Priority 1)"
                  : t === "Trauma"
                  ? "🔴 Severe Trauma & Road Accident"
                  : t === "Cardiac"
                  ? "🟠 Cardiovascular & Stroke"
                  : t === "Pediatric"
                  ? "🔵 Pediatric / Neonatal Resuscitation"
                  : t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-[var(--foreground)]">Triage Priority</label>
          <select
            className="select text-xs"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="1">Priority 1 (Critical / Resuscitation / Obstructed Labor)</option>
            <option value="2">Priority 2 (Urgent / Active Transfer)</option>
            <option value="3">Priority 3 (Standard Pre-Hospital Care)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-[var(--foreground)]">Patient Age Band</label>
          <select
            className="select text-xs"
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value)}
          >
            {AGE_BANDS.map((a) => (
              <option key={a} value={a}>
                {a === "unknown" ? "Age: Unknown" : `Age: ${a}`}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-[var(--foreground)]">Patient / Caller Phone</label>
          <input
            className="input text-xs"
            placeholder="e.g. 08035551212"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="font-bold text-[var(--foreground)] flex items-center justify-between">
            <span>SBAR Clinical Situation & Pre-Referral Details</span>
            <span className="text-[11px] font-normal text-[var(--muted)]">
              Automatically pre-alerts receiving emergency facility
            </span>
          </label>
          <textarea
            className="input text-xs min-h-[64px]"
            placeholder="Clinical observations, vitals, IV access, medications given..."
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between gap-3 border-t border-[var(--border)]">
        <div className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Targeting: <strong>{REGION_CLUSTERS[cluster === "all" ? "ibadan_private" : cluster].name}</strong>
          </span>
        </div>
        <button className="btn btn-primary text-xs px-5 py-2 font-bold shadow-sm" type="submit" disabled={busy}>
          {busy ? "Transmitting Emergency…" : "Transmit Emergency Dispatch"}
        </button>
      </div>

      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </form>
  );
}
