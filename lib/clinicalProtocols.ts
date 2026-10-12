export type ClinicalSpecialty = 'obstetric' | 'trauma' | 'cardiovascular' | 'pediatric' | 'general';

export interface SBARHandover {
  specialty: ClinicalSpecialty;
  situation: {
    primaryComplaint: string;
    priorityTier: 'P1-CRITICAL' | 'P2-URGENT' | 'P3-STANDARD';
    vitalsSummary: string; // e.g. "BP: 140/90, HR: 110, SpO2: 96%"
  };
  background: {
    historyNotes: string;
    allergies: string;
    // Specialty specific fields
    gestationalAgeWeeks?: number;
    gravidityParity?: string; // e.g. "G3P2"
    fetalHeartTones?: string;  // e.g. "140 bpm, regular"
    membraneRupture?: boolean;
    bleedingSeverity?: 'None' | 'Mild spotting' | 'Moderate' | 'Severe hemorrhage';
    glasgowComaScale?: number; // 3 - 15
    polytraumaTags?: string[]; // e.g. ["Pelvic fracture", "Blunt chest"]
    onsetTime?: string;
    stemiOrStrokeSigns?: boolean; // FAST / STEMI
    pediatricDistress?: boolean;  // Grunting, nasal flaring, chest indrawing
  };
  assessment: {
    fieldImpression: string;
    stability: 'Stable' | 'Guarded' | 'Unstable' | 'Critical deterioration';
  };
  recommendation: {
    requiredBay: 'Resuscitation Bay' | 'Obstetric / L&D Theater' | 'Trauma Red Bay' | 'ICU / CCU' | 'Standard Acute Bed';
    bloodBankPreAlert: boolean;
    theaterPrepRequired: boolean;
    onCallSpecialist: string;
  };
  reportedBy?: string;
  timestamp?: string;
}

/**
 * Serializes SBAR structure into clean machine-readable string embedded into emergency_requests notes.
 */
export function encodeSBARHandover(sbar: SBARHandover): string {
  try {
    const compactJson = JSON.stringify(sbar);
    return `[SBAR_CLINICAL:${compactJson}]`;
  } catch {
    return '';
  }
}

/**
 * Extracts and parses SBAR handover from emergency_requests notes string.
 */
export function parseSBARHandover(notes?: string | null): SBARHandover | null {
  if (!notes) return null;
  const match = notes.match(/\[SBAR_CLINICAL:(\{.*?\})\]/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as SBARHandover;
  } catch {
    return null;
  }
}

/**
 * Human-readable markdown preview of SBAR Handover for clinical staff.
 */
export function formatSBARSummary(sbar: SBARHandover): {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
} {
  const bgDetails: string[] = [];
  if (sbar.background.gestationalAgeWeeks) bgDetails.push(`Gest: ${sbar.background.gestationalAgeWeeks}w`);
  if (sbar.background.gravidityParity) bgDetails.push(`Parity: ${sbar.background.gravidityParity}`);
  if (sbar.background.fetalHeartTones) bgDetails.push(`FHT: ${sbar.background.fetalHeartTones}`);
  if (sbar.background.bleedingSeverity && sbar.background.bleedingSeverity !== 'None') {
    bgDetails.push(`Bleeding: ${sbar.background.bleedingSeverity}`);
  }
  if (sbar.background.glasgowComaScale) bgDetails.push(`GCS: ${sbar.background.glasgowComaScale}/15`);
  if (sbar.background.polytraumaTags && sbar.background.polytraumaTags.length > 0) {
    bgDetails.push(`Trauma: ${sbar.background.polytraumaTags.join(', ')}`);
  }
  if (sbar.background.stemiOrStrokeSigns) bgDetails.push(`ALERT: FAST Stroke / STEMI Positive`);
  if (sbar.background.pediatricDistress) bgDetails.push(`ALERT: Pediatric Respiratory Distress`);
  if (sbar.background.allergies) bgDetails.push(`Allergies: ${sbar.background.allergies}`);
  if (sbar.background.historyNotes) bgDetails.push(sbar.background.historyNotes);

  return {
    situation: `[${sbar.situation.priorityTier}] ${sbar.situation.primaryComplaint} | Vitals: ${sbar.situation.vitalsSummary || 'Pending'}`,
    background: bgDetails.join(' | ') || 'No chronic background recorded',
    assessment: `${sbar.assessment.fieldImpression} (Stability: ${sbar.assessment.stability})`,
    recommendation: `Alloc: ${sbar.recommendation.requiredBay} | Blood Bank: ${sbar.recommendation.bloodBankPreAlert ? 'PRE-ALERTED' : 'Not required'} | Theater: ${sbar.recommendation.theaterPrepRequired ? 'PREP ACTIVE' : 'Standby'} | On-Call: ${sbar.recommendation.onCallSpecialist}`
  };
}
