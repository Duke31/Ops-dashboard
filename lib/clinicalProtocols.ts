/**
 * Solace EMS Clinical & Medical Protocol Layer
 * Implements Specialized Triage Protocols (Obstetric, Trauma, Cardiac, Pediatric)
 * and Standardized SBAR Clinical Handover serialization/deserialization.
 */

import {
  CLINICAL_SPECIALTIES,
  ClinicalSpecialtyConfig,
  extractSbarData,
  SbarHandoverData,
} from "./regionClusters";
import type { EmergencyRequest } from "./types";

export { CLINICAL_SPECIALTIES, extractSbarData };
export type { ClinicalSpecialtyConfig, SbarHandoverData };

// Specialized Clinical Triage Types
export interface ObstetricClinicalData {
  gestationalAgeWeeks?: number;
  gravidity?: number;
  parity?: number;
  fetalHeartTonesPresent?: boolean;
  membraneRupture?: boolean;
  liquorAppearance?: "clear" | "meconium_stained" | "blood_stained";
  bleedingSeverity?: "none" | "mild_spotting" | "moderate" | "severe_hemorrhage";
  contractionsFrequencyMinutes?: number;
  preReferralMgS04Given?: boolean;
}

export interface TraumaClinicalData {
  gcsScore?: number; // Glasgow Coma Scale (3 - 15)
  mechanism?: "road_traffic_collision" | "fall" | "penetrating_injury" | "blunt_trauma" | "burn";
  polytrauma?: boolean;
  activeHemorrhage?: boolean;
  tourniquetApplied?: boolean;
  cervicalCollarApplied?: boolean;
  suspectedFractures?: string[];
}

export interface CardiovascularClinicalData {
  onsetTimeMinutes?: number;
  fastFacialDroop?: boolean;
  fastArmWeakness?: boolean;
  fastSpeechDifficulty?: boolean;
  stemiSuspected?: boolean;
  systolicBp?: number;
  diastolicBp?: number;
  spo2Percent?: number;
  pulseRate?: number;
  aspirinChewed?: boolean;
}

export interface PediatricClinicalData {
  ageYears?: number;
  subcostalIndrawing?: boolean;
  stridorPresent?: boolean;
  grunting?: boolean;
  cyanosis?: boolean;
  temperatureCelsius?: number;
  weightKg?: number;
  convulsing?: boolean;
}

export interface ClinicalTriageAssessment {
  specialty: "Obstetric" | "Trauma" | "Cardiac" | "Pediatric" | "Respiratory";
  priorityTier: 1 | 2 | 3; // 1 = Critical, 2 = Urgent, 3 = Standard
  stabilityTier: "Stable" | "Guarded" | "Unstable" | "Critical deterioration";
  requiredBay:
    | "Obstetric / L&D Theater"
    | "Trauma Bay 1 (Red)"
    | "Resuscitation Suite"
    | "Pediatric Bay"
    | "Acute Medical Ward";
  theaterRequested: boolean;
  bloodBankPreAlert: boolean;
  bloodUnitsRequested?: number;
  bloodTypeNeeded?: string;
  obstetric?: ObstetricClinicalData;
  trauma?: TraumaClinicalData;
  cardiac?: CardiovascularClinicalData;
  pediatric?: PediatricClinicalData;
}

/**
 * Serializes SBAR clinical handover note into standard database notes text format
 */
export function serializeSbarNote(
  sbar: SbarHandoverData,
  clinical?: Partial<ClinicalTriageAssessment>,
): string {
  let note = `[SBAR HANDOVER | S: ${sbar.situation} | B: ${sbar.background} | A: ${sbar.assessment} | R: ${sbar.recommendation}]`;

  if (sbar.theaterRequested) {
    note += ` [THEATER: REQUESTED]`;
  }
  if (sbar.bloodRequested) {
    note += ` [BLOOD_BANK: PRE_ALERT O-NEG]`;
  }
  if (sbar.escalationTier > 1) {
    note += ` [ESCALATION TIER ${sbar.escalationTier}]: ${sbar.escalatedTo || "Referral Hub"}`;
  }

  if (clinical?.obstetric) {
    const ob = clinical.obstetric;
    note += ` [OBSTETRIC: G${ob.gravidity || "?"}P${ob.parity || "?"} | ${ob.gestationalAgeWeeks || "?"}wks | Bleeding: ${ob.bleedingSeverity || "none"}]`;
  } else if (clinical?.trauma) {
    const tr = clinical.trauma;
    note += ` [TRAUMA: GCS ${tr.gcsScore || "?"}/15 | Active Bleed: ${tr.activeHemorrhage ? "YES" : "NO"} | Polytrauma: ${tr.polytrauma ? "YES" : "NO"}]`;
  } else if (clinical?.cardiac) {
    const cd = clinical.cardiac;
    note += ` [CARDIAC: SpO2 ${cd.spo2Percent || "?"}% | BP ${cd.systolicBp || "?"}/${cd.diastolicBp || "?"} | FAST: ${cd.fastFacialDroop || cd.fastArmWeakness ? "POSITIVE" : "NEGATIVE"}]`;
  } else if (clinical?.pediatric) {
    const pd = clinical.pediatric;
    note += ` [PEDIATRIC: Age ${pd.ageYears || "?"}y | Stridor: ${pd.stridorPresent ? "YES" : "NO"} | Retractions: ${pd.subcostalIndrawing ? "YES" : "NO"}]`;
  }

  return note;
}

/**
 * Parses full clinical assessment from an existing EmergencyRequest notes
 */
export function parseClinicalNotes(req: EmergencyRequest): ClinicalTriageAssessment {
  const sbar = extractSbarData(req);
  const notes = req.notes || "";
  const type = (req.emergency_type || "Trauma") as ClinicalTriageAssessment["specialty"];

  let stabilityTier: ClinicalTriageAssessment["stabilityTier"] = "Guarded";
  if (req.priority === 1) stabilityTier = "Critical deterioration";
  else if (req.priority === 2) stabilityTier = "Guarded";
  else stabilityTier = "Stable";

  let requiredBay: ClinicalTriageAssessment["requiredBay"] = "Acute Medical Ward";
  if (type === "Obstetric") requiredBay = "Obstetric / L&D Theater";
  else if (type === "Trauma") requiredBay = "Trauma Bay 1 (Red)";
  else if (type === "Cardiac") requiredBay = "Resuscitation Suite";
  else if (type === "Pediatric") requiredBay = "Pediatric Bay";

  const assessment: ClinicalTriageAssessment = {
    specialty: type,
    priorityTier: (req.priority as 1 | 2 | 3) || 1,
    stabilityTier,
    requiredBay,
    theaterRequested: sbar.theaterRequested,
    bloodBankPreAlert: sbar.bloodRequested,
  };

  // Extract Obstetric tags
  if (notes.includes("[OBSTETRIC:")) {
    const obMatch = notes.match(/\[OBSTETRIC:\s*G(\d+)P(\d+)\s*\|\s*(\d+)wks\s*\|\s*Bleeding:\s*([^\]]+)\]/i);
    if (obMatch) {
      assessment.obstetric = {
        gravidity: parseInt(obMatch[1], 10),
        parity: parseInt(obMatch[2], 10),
        gestationalAgeWeeks: parseInt(obMatch[3], 10),
        bleedingSeverity: obMatch[4].trim() as ObstetricClinicalData["bleedingSeverity"],
      };
    }
  }

  // Extract Trauma tags
  if (notes.includes("[TRAUMA:")) {
    const trMatch = notes.match(/\[TRAUMA:\s*GCS\s*(\d+)\/15\s*\|\s*Active Bleed:\s*(YES|NO)\s*\|\s*Polytrauma:\s*(YES|NO)\]/i);
    if (trMatch) {
      assessment.trauma = {
        gcsScore: parseInt(trMatch[1], 10),
        activeHemorrhage: trMatch[2].toUpperCase() === "YES",
        polytrauma: trMatch[3].toUpperCase() === "YES",
      };
    }
  }

  return assessment;
}
