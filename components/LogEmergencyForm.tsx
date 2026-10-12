"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";
import { rpcMessage } from "@/lib/rpc-error";
import { REGION_CLUSTERS, RegionClusterId, classifyClusterByCoordinates } from "@/lib/regionClusters";
import { ClinicalSpecialty, SBARHandover, encodeSBARHandover } from "@/lib/clinicalProtocols";

const TYPES = [
  "Obstetric",
  "Trauma",
  "Cardiac",
  "Stroke",
  "Respiratory",
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

  // Regional selection
  const [cluster, setCluster] = useState<RegionClusterId>("ibadan_private");

  // Basic Form
  const [form, setForm] = useState({
    patient_address: "",
    patient_lat: "",
    patient_lng: "",
    emergency_type: "Obstetric",
    priority: "1",
    contact_phone: "",
    patient_age_band: "18-39",
    general_notes: "",
  });

  // Clinical Protocols & SBAR specific states
  const [showClinicalProtocol, setShowClinicalProtocol] = useState(true);
  const [vitalsSummary, setVitalsSummary] = useState("BP: 120/80, HR: 88, SpO2: 98%");
  const [fieldImpression, setFieldImpression] = useState("");
  const [stability, setStability] = useState<'Stable' | 'Guarded' | 'Unstable' | 'Critical deterioration'>('Guarded');
  const [requiredBay, setRequiredBay] = useState<'Resuscitation Bay' | 'Obstetric / L&D Theater' | 'Trauma Red Bay' | 'ICU / CCU' | 'Standard Acute Bed'>('Obstetric / L&D Theater');
  const [bloodBankPreAlert, setBloodBankPreAlert] = useState(false);
  const [theaterPrepRequired, setTheaterPrepRequired] = useState(false);
  const [allergies, setAllergies] = useState("NKDA");

  // Obstetric Specifics
  const [gestationalAge, setGestationalAge] = useState<number>(36);
  const [gravidityParity, setGravidityParity] = useState("G2P1");
  const [fetalHeartTones, setFetalHeartTones] = useState("140 bpm, regular");
  const [membraneRupture, setMembraneRupture] = useState(false);
  const [bleedingSeverity, setBleedingSeverity] = useState<'None' | 'Mild spotting' | 'Moderate' | 'Severe hemorrhage'>('Moderate');

  // Trauma Specifics
  const [gcs, setGcs] = useState<number>(15);
  const [polytrauma, setPolytrauma] = useState<string>("Blunt trauma, extremity injury");

  // Cardiac / Stroke Specifics
  const [stemiStrokeSign, setStemiStrokeSign] = useState(false);

  // Pediatric Specifics
  const [pediatricDistress, setPediatricDistress] = useState(false);

  function handleClusterChange(newCluster: RegionClusterId) {
    setCluster(newCluster);
    if (newCluster !== "all") {
      const coords = REGION_CLUSTERS[newCluster]?.center;
      if (coords && !form.patient_lat && !form.patient_lng) {
        setForm(prev => ({
          ...prev,
          patient_lat: coords.lat.toString(),
          patient_lng: coords.lng.toString()
        }));
      }
    }
  }

  function handleCoordinatesBlur() {
    if (form.patient_lat && form.patient_lng) {
      const lat = Number(form.patient_lat);
      const lng = Number(form.patient_lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        const detected = classifyClusterByCoordinates(lat, lng);
        setCluster(detected);
      }
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
      // Build SBAR Handover payload
      const clinicalSpecialty: ClinicalSpecialty = 
        form.emergency_type === "Obstetric" ? "obstetric" :
        form.emergency_type === "Trauma" ? "trauma" :
        (form.emergency_type === "Cardiac" || form.emergency_type === "Stroke") ? "cardiovascular" :
        form.emergency_type === "Pediatric" ? "pediatric" : "general";

      const priorityLabel = 
        form.priority === "1" ? "P1-CRITICAL" :
        form.priority === "2" ? "P2-URGENT" : "P3-STANDARD";

      const sbar: SBARHandover = {
        specialty: clinicalSpecialty,
        situation: {
          primaryComplaint: `${form.emergency_type} Emergency: ${form.general_notes || form.patient_address}`,
          priorityTier: priorityLabel,
          vitalsSummary: vitalsSummary.trim() || "Vitals pending dispatch assessment",
        },
        background: {
          historyNotes: form.general_notes.trim(),
          allergies: allergies.trim(),
          gestationalAgeWeeks: clinicalSpecialty === 'obstetric' ? gestationalAge : undefined,
          gravidityParity: clinicalSpecialty === 'obstetric' ? gravidityParity : undefined,
          fetalHeartTones: clinicalSpecialty === 'obstetric' ? fetalHeartTones : undefined,
          membraneRupture: clinicalSpecialty === 'obstetric' ? membraneRupture : undefined,
          bleedingSeverity: clinicalSpecialty === 'obstetric' ? bleedingSeverity : undefined,
          glasgowComaScale: clinicalSpecialty === 'trauma' ? gcs : undefined,
          polytraumaTags: clinicalSpecialty === 'trauma' && polytrauma ? polytrauma.split(',').map(s => s.trim()) : undefined,
          stemiOrStrokeSigns: clinicalSpecialty === 'cardiovascular' ? stemiStrokeSign : undefined,
          pediatricDistress: clinicalSpecialty === 'pediatric' ? pediatricDistress : undefined,
        },
        assessment: {
          fieldImpression: fieldImpression.trim() || `${form.emergency_type} case dispatched under protocol`,
          stability: stability,
        },
        recommendation: {
          requiredBay: requiredBay,
          bloodBankPreAlert: bloodBankPreAlert,
          theaterPrepRequired: theaterPrepRequired,
          onCallSpecialist: `${form.emergency_type} Attending Consultant`,
        },
        timestamp: new Date().toISOString(),
      };

      const sbarTag = encodeSBARHandover(sbar);
      const clusterTag = `[cluster:${cluster}]`;
      const combinedNotes = `${form.general_notes.trim()} ${clusterTag} ${sbarTag}`.trim();

      const { data, error: err } = await supabase.rpc(
        "create_emergency_request",
        {
          p_patient_lat: Number(form.patient_lat),
          p_patient_lng: Number(form.patient_lng),
          p_patient_address: form.patient_address.trim(),
          p_emergency_type: form.emergency_type,
          p_priority: Number(form.priority),
          p_notes: combinedNotes || null,
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
      setOk(id ? `Logged & Escalation Active: ${id}.` : "Emergency request logged successfully.");
      
      setForm({
        patient_address: "",
        patient_lat: "",
        patient_lng: "",
        emergency_type: "Obstetric",
        priority: "1",
        contact_phone: "",
        patient_age_band: "18-39",
        general_notes: "",
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
      className="card p-5 grid md:grid-cols-2 gap-4 mb-6 border border-slate-700/60 shadow-lg bg-slate-900/40"
    >
      <div className="md:col-span-2 flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            Log New Emergency Dispatch
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Regional clustering, multi-specialty triage & standardized SBAR handover pre-alert.
          </p>
        </div>

        {/* Regional Network Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
          <span className="text-xs font-semibold text-slate-300 pl-1">Network:</span>
          <select
            className="bg-slate-900 text-xs text-amber-300 font-medium px-2 py-1 rounded border border-slate-600 focus:outline-none"
            value={cluster}
            onChange={(e) => handleClusterChange(e.target.value as RegionClusterId)}
          >
            <option value="ibadan_private">Ibadan Private Hospital Network</option>
            <option value="osun_pilot">Osun State Pilot (OSEMSAS)</option>
            <option value="lagos_metro">Lagos Metropolitan Fleet</option>
          </select>
        </div>
      </div>

      <input
        className="input md:col-span-2"
        placeholder="Patient location / scene address *"
        value={form.patient_address}
        onChange={(e) =>
          setForm({ ...form, patient_address: e.target.value })
        }
        required
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          placeholder="Latitude (e.g. 7.3775)"
          inputMode="decimal"
          value={form.patient_lat}
          onChange={(e) => setForm({ ...form, patient_lat: e.target.value })}
          onBlur={handleCoordinatesBlur}
          required
        />
        <input
          className="input"
          placeholder="Longitude (e.g. 3.9470)"
          inputMode="decimal"
          value={form.patient_lng}
          onChange={(e) => setForm({ ...form, patient_lng: e.target.value })}
          onBlur={handleCoordinatesBlur}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          className="select"
          value={form.emergency_type}
          onChange={(e) => {
            const nextType = e.target.value;
            setForm({ ...form, emergency_type: nextType });
            if (nextType === "Obstetric") {
              setRequiredBay("Obstetric / L&D Theater");
              setForm(prev => ({ ...prev, priority: "1" }));
            } else if (nextType === "Trauma") {
              setRequiredBay("Trauma Red Bay");
              setForm(prev => ({ ...prev, priority: "1" }));
            } else if (nextType === "Cardiac" || nextType === "Stroke") {
              setRequiredBay("Resuscitation Bay");
              setForm(prev => ({ ...prev, priority: "1" }));
            }
          }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t} {t === "Obstetric" ? "★ (Priority)" : ""}
            </option>
          ))}
        </select>

        <select
          className="select font-semibold"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          <option value="1" className="text-rose-500 font-bold">Priority 1 (Critical - Immediate)</option>
          <option value="2" className="text-amber-500 font-semibold">Priority 2 (Urgent - 15m)</option>
          <option value="3" className="text-emerald-500">Priority 3 (Standard)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          className="select"
          value={form.patient_age_band}
          onChange={(e) =>
            setForm({ ...form, patient_age_band: e.target.value })
          }
        >
          {AGE_BANDS.map((a) => (
            <option key={a} value={a}>
              Age: {a}
            </option>
          ))}
        </select>

        <input
          className="input"
          placeholder="Contact phone (caller / relative)"
          value={form.contact_phone}
          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
        />
      </div>

      {/* Clinical SBAR Accordion */}
      <div className="md:col-span-2 border border-slate-700/80 rounded-lg p-3 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Clinical Protocol & SBAR Handover Generator
          </div>
          <button
            type="button"
            onClick={() => setShowClinicalProtocol(!showClinicalProtocol)}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            {showClinicalProtocol ? "Collapse details" : "Expand SBAR protocol"}
          </button>
        </div>

        {showClinicalProtocol && (
          <div className="grid md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
            {/* Obstetric Protocol fields */}
            {form.emergency_type === "Obstetric" && (
              <>
                <div className="p-2.5 rounded bg-pink-950/20 border border-pink-900/40 md:col-span-2">
                  <span className="font-bold text-pink-400">Obstetric & Maternal Triage Protocol:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">Gestational Age (wks)</label>
                      <input
                        type="number"
                        className="input text-xs py-1 mt-0.5"
                        value={gestationalAge}
                        onChange={(e) => setGestationalAge(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Parity (Grav/Para)</label>
                      <input
                        className="input text-xs py-1 mt-0.5"
                        value={gravidityParity}
                        onChange={(e) => setGravidityParity(e.target.value)}
                        placeholder="e.g. G2P1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Fetal Heart Rate</label>
                      <input
                        className="input text-xs py-1 mt-0.5"
                        value={fetalHeartTones}
                        onChange={(e) => setFetalHeartTones(e.target.value)}
                        placeholder="e.g. 140 bpm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Vaginal Bleeding</label>
                      <select
                        className="select text-xs py-1 mt-0.5"
                        value={bleedingSeverity}
                        onChange={(e) => setBleedingSeverity(e.target.value as any)}
                      >
                        <option value="None">None</option>
                        <option value="Mild spotting">Mild spotting</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe hemorrhage">Severe hemorrhage ⚠️</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-pink-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={membraneRupture}
                      onChange={(e) => setMembraneRupture(e.target.checked)}
                      className="rounded"
                    />
                    Rupture of Membranes (Liquor present / amniotic fluid leaked)
                  </label>
                </div>
              </>
            )}

            {/* Trauma Protocol fields */}
            {form.emergency_type === "Trauma" && (
              <div className="p-2.5 rounded bg-orange-950/20 border border-orange-900/40 md:col-span-2">
                <span className="font-bold text-orange-400">Severe Trauma / RTC Protocol:</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Glasgow Coma Scale (3-15)</label>
                    <input
                      type="number"
                      min={3}
                      max={15}
                      className="input text-xs py-1 mt-0.5"
                      value={gcs}
                      onChange={(e) => setGcs(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Polytrauma Tags & Injury Focus</label>
                    <input
                      className="input text-xs py-1 mt-0.5"
                      value={polytrauma}
                      onChange={(e) => setPolytrauma(e.target.value)}
                      placeholder="e.g. Hemorrhage, Pelvic injury, Blunt chest"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cardiovascular / Stroke Protocol fields */}
            {(form.emergency_type === "Cardiac" || form.emergency_type === "Stroke") && (
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 md:col-span-2">
                <span className="font-bold text-rose-400">Cardiovascular & Stroke Protocol:</span>
                <label className="flex items-center gap-2 mt-2 text-rose-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stemiStrokeSign}
                    onChange={(e) => setStemiStrokeSign(e.target.checked)}
                    className="rounded"
                  />
                  STEMI or FAST Stroke Positive (Facial droop, Arm weakness, Slurred speech)
                </label>
              </div>
            )}

            {/* Pediatric Protocol */}
            {form.emergency_type === "Pediatric" && (
              <div className="p-2.5 rounded bg-cyan-950/20 border border-cyan-900/40 md:col-span-2">
                <span className="font-bold text-cyan-400">Pediatric & Respiratory Protocol:</span>
                <label className="flex items-center gap-2 mt-2 text-cyan-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pediatricDistress}
                    onChange={(e) => setPediatricDistress(e.target.checked)}
                    className="rounded"
                  />
                  Acute Respiratory Distress (Subcostal indrawing, grunting, stridor)
                </label>
              </div>
            )}

            {/* Standard Vitals & Impressions */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Vitals (BP, HR, RR, SpO2, Temp)</label>
              <input
                className="input text-xs"
                placeholder="e.g. BP: 140/90, HR: 110, SpO2: 96%"
                value={vitalsSummary}
                onChange={(e) => setVitalsSummary(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Field Impression / Preliminary Diagnosis</label>
              <input
                className="input text-xs"
                placeholder="e.g. Impending eclampsia / postpartum bleed"
                value={fieldImpression}
                onChange={(e) => setFieldImpression(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Stability Tier</label>
                <select
                  className="select text-xs"
                  value={stability}
                  onChange={(e) => setStability(e.target.value as any)}
                >
                  <option value="Stable">Stable</option>
                  <option value="Guarded">Guarded</option>
                  <option value="Unstable">Unstable</option>
                  <option value="Critical deterioration">Critical deterioration 🚨</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Required Facility Bay</label>
                <select
                  className="select text-xs"
                  value={requiredBay}
                  onChange={(e) => setRequiredBay(e.target.value as any)}
                >
                  <option value="Resuscitation Bay">Resuscitation Bay</option>
                  <option value="Obstetric / L&D Theater">Obstetric / L&D Theater</option>
                  <option value="Trauma Red Bay">Trauma Red Bay</option>
                  <option value="ICU / CCU">ICU / CCU</option>
                  <option value="Standard Acute Bed">Standard Acute Bed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={bloodBankPreAlert}
                  onChange={(e) => setBloodBankPreAlert(e.target.checked)}
                  className="rounded"
                />
                <span className="text-red-400 font-semibold">Pre-Alert Blood Bank (O-Neg)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={theaterPrepRequired}
                  onChange={(e) => setTheaterPrepRequired(e.target.checked)}
                  className="rounded"
                />
                <span className="text-amber-400 font-semibold">Immediate Theater Prep</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <textarea
        className="input md:col-span-2 min-h-[58px]"
        placeholder="Additional dispatch notes, caller landmarks, or clinical details (optional)"
        value={form.general_notes}
        onChange={(e) => setForm({ ...form, general_notes: e.target.value })}
      />

      <div className="md:col-span-2 flex items-center justify-between pt-1">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Active Esc: <strong>Tier 1 Partner Network</strong></span>
          <span>•</span>
          <span>SLA Dispatch Target: <strong>3 mins</strong></span>
        </div>
        <button className="btn btn-primary px-6" type="submit" disabled={busy}>
          {busy ? "Transmitting dispatch…" : "Log Emergency & Alert Network"}
        </button>
      </div>

      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </form>
  );
}
