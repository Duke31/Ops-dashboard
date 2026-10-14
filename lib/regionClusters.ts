import type { EmergencyRequest, Hospital } from "./types";

export type RegionClusterKey = "all" | "ibadan_private" | "osun_pilot" | "lagos_metropolitan";

export interface RegionClusterInfo {
  id: RegionClusterKey;
  name: string;
  shortName: string;
  state: string;
  badge: string;
  description: string;
  fallbackAuthority: string;
  fallbackPhone: string;
  primaryCenter: string;
  slaDispatchMinutes: number;
  slaHospitalMinutes: number;
}

export const REGION_CLUSTERS: Record<Exclude<RegionClusterKey, "all">, RegionClusterInfo> = {
  ibadan_private: {
    id: "ibadan_private",
    name: "Ibadan Private Hospital Network",
    shortName: "Ibadan Private (Oyo)",
    state: "Oyo State",
    badge: "🏥 Ibadan Private Cluster",
    description: "Vetted private tertiary centers & specialist maternity hospitals across Ibadan metropolitan corridors.",
    fallbackAuthority: "Oyo State Emergency Medical Service (732) / UCH Direct Command",
    fallbackPhone: "732 / 0800-SOLACE-IBADAN",
    primaryCenter: "UCH Private Wing & LifeCare Surgical",
    slaDispatchMinutes: 3,
    slaHospitalMinutes: 5,
  },
  osun_pilot: {
    id: "osun_pilot",
    name: "Osun State / OSEMSAS Pilot Cluster",
    shortName: "Osun Pilot (OSEMSAS)",
    state: "Osun State",
    badge: "🏛️ Osun State Pilot",
    description: "State Emergency Medical Services (OSEMSAS) collaborative cluster focused on maternal & trauma transfer.",
    fallbackAuthority: "OSEMSAS Central Emergency Control Room (Osogbo)",
    fallbackPhone: "0800-OSEMSAS-GOV (0803-333-6736)",
    primaryCenter: "State Specialist Hospital Asubiaro & UNIOSUN Teaching Hospital",
    slaDispatchMinutes: 3,
    slaHospitalMinutes: 5,
  },
  lagos_metropolitan: {
    id: "lagos_metropolitan",
    name: "Lagos Metropolitan Emergency Grid",
    shortName: "Lagos Metro",
    state: "Lagos State",
    badge: "🌊 Lagos Metro Grid",
    description: "Multi-facility coastal corridor emergency response grid.",
    fallbackAuthority: "LASEMA / Lagos State Emergency Command (112 / 767)",
    fallbackPhone: "112 / 767",
    primaryCenter: "Mainland General Hospital & Lekki Emergency",
    slaDispatchMinutes: 4,
    slaHospitalMinutes: 6,
  },
};

export const CLUSTER_CENTROIDS: Record<Exclude<RegionClusterKey, "all">, { lat: number; lng: number }> = {
  ibadan_private: { lat: 7.3775, lng: 3.9470 },
  osun_pilot: { lat: 7.7827, lng: 4.5418 },
  lagos_metropolitan: { lat: 6.5244, lng: 3.3792 },
};

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Matches coordinates to closest regional cluster using Haversine algorithm
 */
export function classifyClusterByCoordinates(lat: number, lng: number): Exclude<RegionClusterKey, "all"> {
  let closestCluster: Exclude<RegionClusterKey, "all"> = "ibadan_private";
  let minDistance = Infinity;

  for (const [key, centroid] of Object.entries(CLUSTER_CENTROIDS)) {
    const dist = haversineDistanceKm(lat, lng, centroid.lat, centroid.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestCluster = key as Exclude<RegionClusterKey, "all">;
    }
  }

  return closestCluster;
}

export interface ClinicalSpecialtyConfig {
  key: string;
  label: string;
  color: string;
  priorityDefault: number;
  fastTrack: boolean;
  requiredReadiness: string[];
  sbarTemplates: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  };
}

export const CLINICAL_SPECIALTIES: Record<string, ClinicalSpecialtyConfig> = {
  Obstetric: {
    key: "Obstetric",
    label: "Obstetric & Maternal Labor (Priority 1)",
    color: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
    priorityDefault: 1,
    fastTrack: true,
    requiredReadiness: [
      "Delivery Suite Reserved",
      "C-Section Theater On Standby",
      "Blood Bank Crossmatch Alert (O- / Whole Blood)",
      "Obstetrician & Midwife At Curb",
    ],
    sbarTemplates: {
      situation: "Active obstetric labor with complication (suspected prolonged second stage / eclampsia / antepartum hemorrhage).",
      background: "Gravida 2 Para 1, estimated 38 weeks gestation. En route via Solace priority transit.",
      assessment: "Fetal heart tones documented viable, active contractions every 2-3 mins. Pre-referral loading dose of IV Magnesium Sulphate administered if eclamptic.",
      recommendation: "Immediate curb reception, direct wheel-in to Delivery Suite / Theater. Have 2 units uncrossed O-negative PRBC on immediate standby.",
    },
  },
  Trauma: {
    key: "Trauma",
    label: "Severe Trauma & Road Accident (Priority 1)",
    color: "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
    priorityDefault: 1,
    fastTrack: true,
    requiredReadiness: [
      "Trauma Bay 1 / Resuscitation Suite Prepped",
      "Emergency Surgery / Orthopedic Team Standby",
      "Massive Transfusion Protocol On-Call",
      "Cervical Collar / Spine Board Protocol",
    ],
    sbarTemplates: {
      situation: "High-acuity vehicular collision / blunt trauma with active bleeding.",
      background: "Adult patient, rapid extrication performed on scene.",
      assessment: "Glasgow Coma Scale: 12-14, tourniquet / pressure dressing applied to limb hemorrhage, cervical collar stabilized.",
      recommendation: "Immediate Trauma Bay reception, portable X-ray / FAST ultrasound at bedside, emergency surgeon on standby.",
    },
  },
  Cardiac: {
    key: "Cardiac",
    label: "Cardiovascular / Acute Coronary / Stroke",
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    priorityDefault: 1,
    fastTrack: true,
    requiredReadiness: [
      "Resuscitation Suite / Cath Lab Pre-Alert",
      "12-Lead Telemetry Unit Ready",
      "Cardiac Intensive Care Bed Reserved",
    ],
    sbarTemplates: {
      situation: "Acute crushing retrosternal chest pain radiating to left jaw / suspected STEMI or acute stroke.",
      background: "Onset 45 minutes prior to call. Hypertensive history.",
      assessment: "SpO2 94% on ambient air, high-flow oxygen initiated. Aspirin 300mg chewed on scene if non-contraindicated.",
      recommendation: "Immediate direct triage to Resuscitation Suite, emergency physician bedside evaluation on arrival.",
    },
  },
  Pediatric: {
    key: "Pediatric",
    label: "Pediatric & Neonatal Resuscitation",
    color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    priorityDefault: 2,
    fastTrack: true,
    requiredReadiness: [
      "Pediatric Resuscitation Bay Prepped",
      "Neonatal Incubator / Warmer On Standby",
      "Pediatric Intensivist On Duty",
    ],
    sbarTemplates: {
      situation: "Pediatric patient in severe respiratory distress / acute febrile convulsion.",
      background: "Child under 5 years of age. Symptoms worsening rapidly over past 2 hours.",
      assessment: "Marked subcostal retractions, fever 39.1°C, airway patent on humidified oxygen.",
      recommendation: "Prepare pediatric resuscitation equipment, weight-based emergency medication chart at bedside.",
    },
  },
  Respiratory: {
    key: "Respiratory",
    label: "Acute Respiratory & Medical",
    color: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
    priorityDefault: 2,
    fastTrack: false,
    requiredReadiness: [
      "Oxygen Therapy Unit Ready",
      "Acute Observation Bed Reserved",
      "Nebulization / Non-Invasive Ventilation Ready",
    ],
    sbarTemplates: {
      situation: "Severe acute asthma exacerbation / acute respiratory distress.",
      background: "Known asthmatic, inhaler unresponsive at home.",
      assessment: "Bilateral wheezes, SpO2 88% rising to 95% on nasal cannula.",
      recommendation: "Prepare continuous nebulization and acute observation bed with vitals telemetry.",
    },
  },
};

/**
 * Detects regional cluster of a hospital or request based on coordinates or address
 */
export function detectCluster(item: {
  address?: string | null;
  patient_address?: string | null;
  lat?: number | null;
  lng?: number | null;
  patient_lat?: number | null;
  patient_lng?: number | null;
  notes?: string | null;
}): RegionClusterKey {
  const notes = item.notes || "";
  if (notes.includes("CLUSTER: ibadan_private")) return "ibadan_private";
  if (notes.includes("CLUSTER: osun_pilot")) return "osun_pilot";
  if (notes.includes("CLUSTER: lagos_metropolitan")) return "lagos_metropolitan";

  const text = `${item.address || ""} ${item.patient_address || ""}`.toLowerCase();
  if (text.includes("ibadan") || text.includes("oyo") || text.includes("bodija") || text.includes("uch") || text.includes("ring road")) {
    return "ibadan_private";
  }
  if (text.includes("osun") || text.includes("osogbo") || text.includes("osemsas") || text.includes("asubiaro") || text.includes("ife")) {
    return "osun_pilot";
  }
  if (text.includes("lagos") || text.includes("yaba") || text.includes("lekki") || text.includes("ikeja")) {
    return "lagos_metropolitan";
  }

  const lat = item.lat ?? item.patient_lat;
  const lng = item.lng ?? item.patient_lng;
  if (lat != null && lng != null) {
    return classifyClusterByCoordinates(lat, lng);
  }

  // Default to Ibadan Private cluster since drivers and current expansion are centered in Ibadan
  return "ibadan_private";
}

export interface SbarHandoverData {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  specialty: string;
  preReferralMedications: string[];
  theaterRequested: boolean;
  bloodRequested: boolean;
  escalationTier: number;
  escalatedTo?: string;
  lastUpdated?: string;
}

/**
 * Extracts or synthesizes structured SBAR clinical handover information from an emergency request
 */
export function extractSbarData(req: EmergencyRequest): SbarHandoverData {
  const notes = req.notes || "";
  const type = req.emergency_type || "Trauma";
  const config = CLINICAL_SPECIALTIES[type] || CLINICAL_SPECIALTIES.Trauma;

  // Check if explicit [SBAR ...] block exists in notes
  const sbarMatch = notes.match(/\[SBAR\s+HANDOVER:?([\s\S]*?)\]/i);

  let situation = config.sbarTemplates.situation;
  let background = config.sbarTemplates.background;
  let assessment = config.sbarTemplates.assessment;
  let recommendation = config.sbarTemplates.recommendation;
  let escalationTier = 1;
  let escalatedTo = undefined;

  // Extract escalation tier if logged
  const escMatch = notes.match(/\[ESCALATION\s+TIER\s+(\d+)\]:\s*([^|\]\n\r]+)/i);
  if (escMatch) {
    escalationTier = parseInt(escMatch[1], 10) || 1;
    escalatedTo = escMatch[2].trim();
  }

  if (sbarMatch) {
    const content = sbarMatch[1];
    const sMatch = content.match(/S:\s*([^|;\n]+)/i);
    const bMatch = content.match(/B:\s*([^|;\n]+)/i);
    const aMatch = content.match(/A:\s*([^|;\n]+)/i);
    const rMatch = content.match(/R:\s*([^|;\n]+)/i);

    if (sMatch) situation = sMatch[1].trim();
    if (bMatch) background = bMatch[1].trim();
    if (aMatch) assessment = aMatch[1].trim();
    if (rMatch) recommendation = rMatch[1].trim();
  } else if (notes) {
    // If there are clinical notes without explicit SBAR tags, use them in Situation/Assessment
    const cleanNotes = notes
      .replace(/\[PATIENT\s+(?:REVIEW|FEEDBACK|RATING)[^\]]*\]/gi, "")
      .replace(/\[CLUSTER:[^\]]*\]/gi, "")
      .replace(/\[ESCALATION[^\]]*\]/gi, "")
      .trim();

    if (cleanNotes) {
      situation = `${cleanNotes}`;
    }
  }

  const isObstetric = type.toLowerCase().includes("obstetric") || type.toLowerCase().includes("matern");
  const isTrauma = type.toLowerCase().includes("trauma");

  return {
    situation,
    background,
    assessment,
    recommendation,
    specialty: type,
    preReferralMedications: isObstetric
      ? ["Magnesium Sulphate (4g IV loading dose)", "IV Hydration (Normal Saline 500ml)"]
      : isTrauma
      ? ["Tranexamic Acid (1g IV slow push)", "Ringer's Lactate 1L bolus"]
      : ["Normal Saline 0.9% KVO", "Oxygen by cannula"],
    theaterRequested: isObstetric || isTrauma,
    bloodRequested: isObstetric || isTrauma,
    escalationTier,
    escalatedTo,
  };
}

export interface SlaCheckResult {
  elapsedMinutes: number;
  dispatchSlaBreached: boolean;
  hospitalSlaBreached: boolean;
  remainingDispatchSeconds: number;
  remainingHospitalSeconds: number;
}

/**
 * Calculates real-time SLA metrics for emergency requests
 */
export function checkRequestSla(
  req: EmergencyRequest,
  clusterKey: RegionClusterKey = "ibadan_private",
): SlaCheckResult {
  const cluster = REGION_CLUSTERS[clusterKey === "all" ? "ibadan_private" : clusterKey];
  const now = Date.now();
  const createdTime = new Date(req.created_at).getTime();
  const elapsedMs = Math.max(0, now - createdTime);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  const dispatchLimitMs = cluster.slaDispatchMinutes * 60 * 1000;
  const hospitalLimitMs = cluster.slaHospitalMinutes * 60 * 1000;

  const isDispatched = !!req.driver_id || (req.status !== "Requested" && req.status !== "Requested / triage");
  const isHospitalMatched = !!req.hospital_id && (req.status !== "Requested" && req.status !== "Requested / triage");

  const dispatchSlaBreached = !isDispatched && elapsedMs > dispatchLimitMs;
  const hospitalSlaBreached = !isHospitalMatched && elapsedMs > hospitalLimitMs;

  const remainingDispatchSeconds = Math.max(0, Math.floor((dispatchLimitMs - elapsedMs) / 1000));
  const remainingHospitalSeconds = Math.max(0, Math.floor((hospitalLimitMs - elapsedMs) / 1000));

  return {
    elapsedMinutes,
    dispatchSlaBreached,
    hospitalSlaBreached,
    remainingDispatchSeconds,
    remainingHospitalSeconds,
  };
}
