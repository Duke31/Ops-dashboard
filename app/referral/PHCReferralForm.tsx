"use client";

import { useState } from "react";
import type { Hospital } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { rpcMessage } from "@/lib/rpc-error";
import {
  Building2,
  Phone,
  Stethoscope,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  HeartPulse,
  Clock,
  FileText,
  Ambulance,
  ExternalLink,
} from "lucide-react";

const OSUN_PHC_PRESETS = [
  "Iragbiji Comprehensive Health Centre (Boluwaduro LGA)",
  "Ejigbo Town PHC (Ejigbo LGA)",
  "Ede South Comprehensive Health Centre (Ede LGA)",
  "Ila Orangun Model PHC (Ila LGA)",
  "Gbongan Central PHC (Aiyedaade LGA)",
  "Aiyetoro PHC (Osogbo LGA)",
  "Ilesa West Model PHC (Ilesa LGA)",
  "Ikirun Comprehensive PHC (Ifelodun LGA)",
  "Okinni Primary Health Centre (Egbedore LGA)",
  "Other Primary Health Centre (Specify)",
];

const OBSTETRIC_CATEGORIES = [
  {
    key: "bleeding_pph_aph",
    label: "Bleeding / Hemorrhage (PPH / APH)",
    desc: "Active antepartum or postpartum bleeding, soaking pads/clothing, pallor or tachycardia",
    urgency: "Immediate",
  },
  {
    key: "eclampsia_seizures",
    label: "Eclampsia / Convulsions in Pregnancy",
    desc: "Generalized tonic-clonic convulsions or post-ictal state during pregnancy, labor, or puerperium",
    urgency: "Immediate (MgSO4 Priority)",
  },
  {
    key: "severe_preeclampsia",
    label: "Severe Pre-eclampsia (BP ≥ 160/110)",
    desc: "Systolic BP ≥ 160 or Diastolic ≥ 110 mmHg with severe persistent headache, visual disturbances, or epigastric pain",
    urgency: "High Priority",
  },
  {
    key: "obstructed_labor",
    label: "Obstructed / Prolonged Labor",
    desc: "Labor > 12 hours without progress, Bandl's retraction ring, severe maternal exhaustion, or cephalopelvic disproportion",
    urgency: "Urgent Theater Standby",
  },
  {
    key: "maternal_sepsis",
    label: "Maternal Sepsis / Severe Infection",
    desc: "Fever > 38.5°C, foul-smelling lochia/liquor, prolonged rupture of membranes > 18h with maternal tachycardia",
    urgency: "High Priority",
  },
  {
    key: "fetal_distress",
    label: "Fetal Distress / Cord Prolapse / Neonatal Distress",
    desc: "Fetal heart rate < 110 or > 160 bpm, thick meconium stained liquor, or visible umbilical cord prolapse",
    urgency: "Immediate",
  },
];

export function PHCReferralForm({
  hospitals,
  userDisplayName,
  userRole,
}: {
  hospitals: Hospital[];
  userDisplayName: string;
  userRole: string;
}) {
  const supabase = createClient();

  // Facility & Health Worker
  const [selectedPreset, setSelectedPreset] = useState(OSUN_PHC_PRESETS[0]);
  const [customFacility, setCustomFacility] = useState("");
  const [officerName, setOfficerName] = useState(userDisplayName || "");
  const [officerCadre, setOfficerCadre] = useState("Midwife");
  const [officerPhone, setOfficerPhone] = useState("");

  // Patient Info
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAgeBand, setPatientAgeBand] = useState("18-39");
  const [gestationalWeeks, setGestationalWeeks] = useState("36");
  const [parity, setParity] = useState("G2P1");

  // Obstetric Emergency Category
  const [selectedCategory, setSelectedCategory] = useState(OBSTETRIC_CATEGORIES[0].key);

  // Vitals
  const [systolicBp, setSystolicBp] = useState("140");
  const [diastolicBp, setDiastolicBp] = useState("90");
  const [fetalHeartSound, setFetalHeartSound] = useState("Present & Regular (120-160 bpm)");

  // Pre-Referral Interventions Given at PHC
  const [mgso4Given, setMgso4Given] = useState(false);
  const [oxytocinGiven, setOxytocinGiven] = useState(false);
  const [ivFluidsRunning, setIvFluidsRunning] = useState(true);
  const [catheterized, setCatheterized] = useState(false);

  // Clinical Summary & Hospital Choice
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [preferredHospitalId, setPreferredHospitalId] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    id: string;
    facility: string;
    category: string;
  } | null>(null);

  const effectiveFacility =
    selectedPreset === "Other Primary Health Centre (Specify)"
      ? customFacility.trim() || "Rural Primary Health Centre"
      : selectedPreset;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!officerName.trim()) {
      setError("Referring Health Worker name is required.");
      return;
    }
    if (!officerPhone.trim()) {
      setError("A callback phone number is required so OSEMSAS dispatch can reach your PHC.");
      return;
    }

    setSubmitting(true);

    const categoryObj =
      OBSTETRIC_CATEGORIES.find((c) => c.key === selectedCategory) || OBSTETRIC_CATEGORIES[0];

    try {
      // 1. Try secure RPC create_phc_referral
      let reqId: string | null = null;
      try {
        const { data, error: rpcErr } = await supabase.rpc("create_phc_referral", {
          p_referring_facility: effectiveFacility,
          p_referring_officer_name: officerName.trim(),
          p_referring_officer_cadre: officerCadre,
          p_referring_officer_phone: officerPhone.trim(),
          p_patient_name: patientName.trim() || "Maternal Patient",
          p_patient_phone: patientPhone.trim() || null,
          p_patient_age_band: patientAgeBand,
          p_gestational_age_weeks: parseInt(gestationalWeeks, 10) || null,
          p_parity: parity.trim() || null,
          p_condition_category: categoryObj.label,
          p_systolic_bp: parseInt(systolicBp, 10) || null,
          p_diastolic_bp: parseInt(diastolicBp, 10) || null,
          p_fetal_heart_tones: fetalHeartSound,
          p_mgso4_given: mgso4Given,
          p_oxytocin_given: oxytocinGiven,
          p_iv_fluids_running: ivFluidsRunning,
          p_catheterized: catheterized,
          p_clinical_notes: clinicalNotes.trim() || null,
          p_patient_lat: 7.7827,
          p_patient_lng: 4.5418,
          p_preferred_hospital_id: preferredHospitalId || null,
        });

        if (!rpcErr && data) {
          reqId = (data as { id: string }).id;
        }
      } catch (e) {
        console.warn("create_phc_referral RPC unavailable, using fallback insert:", e);
      }

      // 2. Fallback: Direct insert if RPC not yet deployed
      if (!reqId) {
        const sbarSituation = `Stage A PHC Referral from ${effectiveFacility}: ${categoryObj.label} (Pt: ${patientName.trim() || "Maternal Patient"})`;
        const sbarBackground = `Gestation: ${gestationalWeeks}wks, Parity: ${parity}, Age: ${patientAgeBand}. Ref Officer: ${officerName} (${officerCadre}, Ph: ${officerPhone})`;
        const sbarAssessment = `BP: ${systolicBp}/${diastolicBp}, FHT: ${fetalHeartSound}. Pre-transfer: MgSO4: ${mgso4Given ? "YES (Loading Dose Given)" : "NO"} | Oxytocin: ${oxytocinGiven ? "YES" : "NO"} | IV Fluids: ${ivFluidsRunning ? "YES" : "NO"} | Catheter: ${catheterized ? "YES" : "NO"}. ${clinicalNotes.trim()}`;
        const sbarRecommendation = "Expedite direct admission to Labor Ward / C-Section Theater. Immediate curb reception.";

        const formattedNotes = `[SBAR HANDOVER | S: ${sbarSituation} | B: ${sbarBackground} | A: ${sbarAssessment} | R: ${sbarRecommendation}]\n[PHC_TRANSFER: ${effectiveFacility} | OFFICER: ${officerName} (${officerPhone})]${mgso4Given ? "\n[PRE_REFERRAL_MEDICATION: Magnesium Sulphate (MgSO4) Loading Dose Administered]" : ""}${oxytocinGiven ? "\n[PRE_REFERRAL_MEDICATION: Oxytocin Administered]" : ""}`;

        const { data: inserted, error: insertErr } = await supabase
          .from("emergency_requests")
          .insert({
            origin: "phc_referral",
            stage: "stage_a",
            patient_address: `${effectiveFacility} (PHC Transfer)`,
            patient_lat: 7.7827,
            patient_lng: 4.5418,
            emergency_type: `Obstetric: ${categoryObj.label}`,
            priority: 1,
            notes: formattedNotes,
            contact_phone: officerPhone.trim(),
            patient_age_band: patientAgeBand,
            hospital_id: preferredHospitalId || null,
            status: "Requested",
            lawful_basis: "vital_interests",
            purpose_code: "emergency_medical_dispatch",
          })
          .select("id")
          .single();

        if (insertErr) throw insertErr;
        reqId = inserted?.id || "OSEMSAS-EMR";
      }

      setSuccessResult({
        id: reqId,
        facility: effectiveFacility,
        category: categoryObj.label,
      });
    } catch (err: unknown) {
      setError(rpcMessage(err) || "Failed to submit emergency transfer request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successResult) {
    return (
      <div className="card p-6 md:p-8 border border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              Stage A PHC Transfer Dispatched · OSEMSAS Alerted
            </div>
            <h2 className="text-xl font-black text-[var(--foreground)] mt-1">
              Emergency Transfer Logged Successfully
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1 font-mono">
              Request Tracking ID: {successResult.id}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Referring PHC:</span>
            <strong className="text-[var(--foreground)]">{successResult.facility}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Emergency Category:</span>
            <strong className="text-purple-700 dark:text-purple-400">{successResult.category}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Pre-Alert Broadcast:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Active SBAR Tele-Note Transmitted to Receiving ER Desk
            </span>
          </div>
        </div>

        {/* Immediate Clinical Pre-Transit Directives */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs space-y-2">
          <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Immediate Pre-Hospital Directives While Ambulance Is En Route:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
            <li>Position mother in the <strong>left lateral tilt</strong> (15–30 degrees) to prevent aortocaval compression.</li>
            <li>Maintain open patent airway; ensure oxygen is available if SpO2 &lt; 94%.</li>
            <li>Keep IV line secure and fluids running at prescribed maintenance rate.</li>
            <li>Have the patient’s antenatal card and referral escort slip ready for the OSEMSAS paramedic.</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="tel:112"
            className="btn btn-primary bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 text-xs"
          >
            <Phone className="w-4 h-4" />
            <span>Call OSEMSAS Central Desk (112)</span>
          </a>
          <button
            type="button"
            onClick={() => {
              setSuccessResult(null);
              setPatientName("");
              setClinicalNotes("");
            }}
            className="btn btn-ghost border border-[var(--border)] text-xs font-semibold"
          >
            Log Another Transfer
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-purple-200 border border-white/20">
            <Building2 className="w-3.5 h-3.5" />
            <span>Osun State OSEMSAS Pilot · Stage A Health Worker Portal</span>
          </div>
          <span className="text-xs font-semibold text-purple-300">Priority 1 Maternal Triage</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Primary Healthcare Emergency Referral Intake
        </h1>
        <p className="text-xs text-purple-200/90 leading-relaxed max-w-2xl">
          For midwives, CHEWs, and nurses at rural PHCs. Directly requests an OSEMSAS / Solace ambulance and transmits structured SBAR clinical notes to pre-alert the receiving hospital ER.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Block 1: Referring PHC Facility & Health Worker */}
      <div className="card p-5 border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-sm font-bold text-[var(--foreground)]">
          <Building2 className="w-4 h-4 text-purple-600" />
          <span>Block 1: Referring PHC Facility & Health Worker</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Referring Health Facility <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="select w-full text-xs"
            >
              {OSUN_PHC_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {selectedPreset === "Other Primary Health Centre (Specify)" && (
              <input
                type="text"
                placeholder="Enter facility name, ward, LGA"
                value={customFacility}
                onChange={(e) => setCustomFacility(e.target.value)}
                className="input w-full text-xs mt-2"
                required
              />
            )}
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Referring Officer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Nurse M. Adeleke"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="input w-full text-xs"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Health Worker Cadre
            </label>
            <select
              value={officerCadre}
              onChange={(e) => setOfficerCadre(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="Midwife">Registered Midwife (RM)</option>
              <option value="Nurse">Staff Nurse / Midwife (RN/RM)</option>
              <option value="CHEW">Community Health Extension Worker (CHEW)</option>
              <option value="CHO">Community Health Officer (CHO)</option>
              <option value="Medical Officer">Medical Officer / Doctor</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Referring Officer Callback Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 08012345678"
              value={officerPhone}
              onChange={(e) => setOfficerPhone(e.target.value)}
              className="input w-full text-xs"
              required
            />
          </div>
        </div>
      </div>

      {/* Block 2: Maternal Patient Demographics */}
      <div className="card p-5 border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-sm font-bold text-[var(--foreground)]">
          <HeartPulse className="w-4 h-4 text-pink-600" />
          <span>Block 2: Patient Demographics & Pregnancy History</span>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Patient Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Funke Adeleke"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="input w-full text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Patient / Next-of-Kin Phone
            </label>
            <input
              type="tel"
              placeholder="e.g. 08087654321"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              className="input w-full text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Age Band
            </label>
            <select
              value={patientAgeBand}
              onChange={(e) => setPatientAgeBand(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="13-17">&lt; 18 Teen Pregnancy (13–17)</option>
              <option value="18-39">18–39 Adult Maternal</option>
              <option value="40-64">40+ Advanced Maternal Age</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Gestational Age (Weeks)
            </label>
            <input
              type="number"
              min="1"
              max="45"
              value={gestationalWeeks}
              onChange={(e) => setGestationalWeeks(e.target.value)}
              className="input w-full text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Parity (Gravida / Para)
            </label>
            <input
              type="text"
              placeholder="e.g. G2P1 or G1P0"
              value={parity}
              onChange={(e) => setParity(e.target.value)}
              className="input w-full text-xs"
            />
          </div>
        </div>
      </div>

      {/* Block 3: Obstetric Emergency Category (6 In-Scope Conditions) */}
      <div className="card p-5 border border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-sm font-bold text-[var(--foreground)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Block 3: Obstetric Emergency Category (6 In-Scope Pilot Conditions)</span>
          </div>
          <span className="text-xs font-semibold text-purple-600">Select Primary Reason for Transfer</span>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-xs">
          {OBSTETRIC_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <label
                key={cat.key}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? "border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 shadow-xs"
                    : "border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--border)]/30"
                }`}
              >
                <input
                  type="radio"
                  name="obstetricCategory"
                  value={cat.key}
                  checked={isSelected}
                  onChange={() => setSelectedCategory(cat.key)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="min-w-0">
                  <div className="font-bold text-[var(--foreground)]">{cat.label}</div>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">{cat.desc}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                    {cat.urgency}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Block 4: Vital Signs & Clinical Assessment */}
      <div className="card p-5 border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-sm font-bold text-[var(--foreground)]">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <span>Block 4: Vital Signs & Clinical Examination</span>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Systolic BP (mmHg)
            </label>
            <input
              type="number"
              placeholder="e.g. 140"
              value={systolicBp}
              onChange={(e) => setSystolicBp(e.target.value)}
              className="input w-full text-xs font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Diastolic BP (mmHg)
            </label>
            <input
              type="number"
              placeholder="e.g. 90"
              value={diastolicBp}
              onChange={(e) => setDiastolicBp(e.target.value)}
              className="input w-full text-xs font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Fetal Heart Sound (FHT)
            </label>
            <select
              value={fetalHeartSound}
              onChange={(e) => setFetalHeartSound(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="Present & Regular (120-160 bpm)">Present & Regular (120-160 bpm)</option>
              <option value="Distressed / Tachycardic (> 160 bpm)">Distressed / Tachycardic (&gt; 160 bpm)</option>
              <option value="Distressed / Bradycardic (< 110 bpm)">Distressed / Bradycardic (&lt; 110 bpm)</option>
              <option value="Absent / Undetected">Absent / Undetected</option>
              <option value="Unchecked">Unchecked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Block 5: Pre-Referral Interventions Given at PHC */}
      <div className="card p-5 border border-[var(--border)] space-y-3 bg-indigo-50/20 dark:bg-indigo-950/10">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-sm font-bold text-[var(--foreground)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Block 5: Pre-Referral Interventions Given at PHC (Clinical Governance)</span>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
            Mandatory Protocol Tracking
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <label className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={mgso4Given}
              onChange={(e) => setMgso4Given(e.target.checked)}
              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <div className="font-bold text-[var(--foreground)]">
                Magnesium Sulphate (MgSO4) Loading Dose Given
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                4g IV slow + 10g IM (5g in each buttock) for severe pre-eclampsia/eclampsia
              </p>
            </div>
          </label>

          <label className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={oxytocinGiven}
              onChange={(e) => setOxytocinGiven(e.target.checked)}
              className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
            />
            <div>
              <div className="font-bold text-[var(--foreground)]">
                Oxytocin Administered (10 IU IM/IV)
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Administered for active postpartum hemorrhage / uterine atony
              </p>
            </div>
          </label>

          <label className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={ivFluidsRunning}
              onChange={(e) => setIvFluidsRunning(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <div className="font-bold text-[var(--foreground)]">
                IV Line Secured & Fluids Running
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                16G / 18G cannula in place with Normal Saline or Ringer&apos;s Lactate
              </p>
            </div>
          </label>

          <label className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={catheterized}
              onChange={(e) => setCatheterized(e.target.checked)}
              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
            />
            <div>
              <div className="font-bold text-[var(--foreground)]">
                Urinary Catheter in Place
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Foley catheter placed with urine bag attached for output monitoring
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Block 6: Summary & Hospital Preference */}
      <div className="card p-5 border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-sm font-bold text-[var(--foreground)]">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Block 6: Additional Clinical Notes & Receiving Hospital Preference</span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Clinical Findings & Reason for Transfer
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Primigravida at 38 weeks presenting with elevated BP 160/110, severe frontal headache, and hyperreflexia. Loading dose MgSO4 given at 10:15 AM."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="input w-full text-xs py-2"
            />
          </div>

          <div>
            <label className="font-semibold text-[var(--foreground)] block mb-1">
              Preferred Receiving Hospital (Preference Only · Dispatcher Coordinates Assignment)
            </label>
            <select
              value={preferredHospitalId}
              onChange={(e) => setPreferredHospitalId(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="">No Preference — Closest Confirmed Center with Theater</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} {h.address ? `(${h.address})` : ""} — {h.available_capacity ?? 0} beds
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--muted)] mt-1">
              Hospital assignment is coordinated by OSEMSAS dispatch based on confirmed theater, blood bank, and bed availability.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button & Disclaimer */}
      <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] space-y-3">
        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
          <strong>Notice:</strong> Submitting this referral creates an auditable emergency request on the OSEMSAS / Solace dispatch radar. Dispatch coordinates ambulance routing and notifies the receiving hospital ER with structured SBAR data before arrival.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full py-3.5 text-sm font-bold bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              <span>Transmitting Transfer Request to OSEMSAS Dispatch…</span>
            </>
          ) : (
            <>
              <Ambulance className="w-5 h-5" />
              <span>DISPATCH EMERGENCY AMBULANCE FOR PHC TRANSFER</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
