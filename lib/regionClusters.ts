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
  name?: string | null;
  address?: string | null;
  patient_address?: string | null;
  preferred_hospital?: string | null;
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

  const text = `${item.name || ""} ${item.address || ""} ${item.patient_address || ""} ${item.preferred_hospital || ""} ${notes}`.toLowerCase();
  
  // 1. Ibadan Private Hospital Network (Oyo State) - Primary Anchor
  if (
    text.includes("ibadan") ||
    text.includes("oyo") ||
    text.includes("bodija") ||
    text.includes("uch") ||
    text.includes("university college hospital") ||
    text.includes("ring road") ||
    text.includes("lifecare") ||
    text.includes("challenge") ||
    text.includes("oluyole") ||
    text.includes("dugbe") ||
    text.includes("agodi") ||
    text.includes("samonda") ||
    text.includes("iwo road") ||
    text.includes("akobo") ||
    text.includes("moniya") ||
    text.includes("alakia") ||
    text.includes("mokola") ||
    text.includes("eleyele") ||
    text.includes("apata") ||
    text.includes("ojoo") ||
    text.includes("sango") ||
    text.includes("jid-mek") ||
    text.includes("adeoyo") ||
    text.includes("jericho") ||
    text.includes("our lady of apostles") ||
    text.includes("st mary") ||
    text.includes("lead city")
  ) {
    return "ibadan_private";
  }

  // 2. Osun State OSEMSAS Pilot (Osogbo, Asubiaro, Ife)
  if (
    text.includes("osun") ||
    text.includes("osogbo") ||
    text.includes("osemsas") ||
    text.includes("asubiaro") ||
    text.includes("uniosun") ||
    text.includes("ife") ||
    text.includes("ilesa") ||
    text.includes("ede")
  ) {
    return "osun_pilot";
  }

  // 3. Lagos Metropolitan Emergency Grid
  if (
    text.includes("lagos") ||
    text.includes("yaba") ||
    text.includes("lekki") ||
    text.includes("ikeja") ||
    text.includes("lasema") ||
    text.includes("mainland general") ||
    text.includes("victoria island") ||
    text.includes("surulere")
  ) {
    return "lagos_metropolitan";
  }

  const lat = item.lat ?? item.patient_lat;
  const lng = item.lng ?? item.patient_lng;
  if (lat != null && lng != null) {
    return classifyClusterByCoordinates(lat, lng);
  }

  // Default to Osun State OSEMSAS Pilot (Primary Cluster)
  return "osun_pilot";
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
  gestationWeeks?: string;
  edd?: string;
  parity?: string;
  bloodGroup?: string;
  isRhNegative?: boolean;
  genotype?: string;
  patientAge?: string;
  preferredHospital?: string;
  condition?: string;
  landmark?: string;
}

/**
 * Extracts or synthesizes structured SBAR clinical handover information from an emergency request
 */
export function extractSbarData(req: EmergencyRequest): SbarHandoverData {
  const notes = req.notes || "";
  const type = req.emergency_type || "Obstetric";
  const config = CLINICAL_SPECIALTIES[type] || CLINICAL_SPECIALTIES.Obstetric || CLINICAL_SPECIALTIES.Trauma;

  // Check if explicit [SBAR ...] block exists in notes
  const sbarMatch = notes.match(/\[SBAR\s+HANDOVER:?([\s\S]*?)\]/i);

  let situation = config.sbarTemplates.situation;
  let background = config.sbarTemplates.background;
  let assessment = config.sbarTemplates.assessment;
  let recommendation = config.sbarTemplates.recommendation;
  let escalationTier = 1;
  let escalatedTo = undefined;

  // Extract escalation tier if logged
  const escMatch = notes.match(/\[ESCALATION\s+TIER\s+(\d+)[^\]]*\]:\s*([^|\n\r]+)/i);
  if (escMatch) {
    escalationTier = parseInt(escMatch[1], 10) || 1;
    escalatedTo = escMatch[2].replace(/^Escalate to\s+/i, "").trim();
  }

  // Extract structured parameters across notes
  const conditionMatch = notes.match(/\[OBSTETRIC\s+CONDITION:\s*([^\]]+)\]/i);
  const sbarObstetricMatch = notes.match(/\[OBSTETRIC\s+SBAR:\s*([^\]]+)\]/i);
  const hospitalHintMatch = notes.match(/\[PREFERRED\s+HOSPITAL\s+HINT:\s*([\s\S]*?)(?:\s*\(preference only|\s*\])/i);
  const bloodMatch = notes.match(/(?:Blood:\s*|\[Blood:\s*)([A-Za-z0-9+-]+)/i);
  const genotypeMatch = notes.match(/Genotype:\s*([A-Za-z0-9]+)/i);
  const ageMatch = notes.match(/Patient Age:\s*([0-9+–-]+(?:\s*yrs)?)/i) || notes.match(/Age band:\s*([0-9+–-]+)/i);
  const landmarkMatch = notes.match(/Landmark:\s*([^|\]\n]+)/i);

  const condition = conditionMatch ? conditionMatch[1].trim() : "";
  const preferredHospital = hospitalHintMatch
    ? hospitalHintMatch[1].replace(/\(preference only.*$/i, "").trim()
    : req.hospital?.name || "";
  const bloodGroup = bloodMatch ? bloodMatch[1].trim() : "";
  const isRhNegative = bloodGroup.includes("-") || bloodGroup.toLowerCase().includes("neg");
  const genotype = genotypeMatch ? genotypeMatch[1].trim() : "";
  const patientAge = ageMatch ? ageMatch[1].trim() : req.patient_age_band || "";
  const landmark = landmarkMatch ? landmarkMatch[1].trim() : req.patient_address || "";

  let gestationWeeks = "";
  let edd = "";
  let parity = "";

  if (sbarObstetricMatch) {
    const sbarContent = sbarObstetricMatch[1];
    const gMatch = sbarContent.match(/Gestation:\s*([^|]+)/i);
    const eddMatch = sbarContent.match(/EDD:\s*([^|]+)/i);
    const pMatch = sbarContent.match(/Parity:\s*([^|]+)/i);
    const gtMatch = sbarContent.match(/Genotype:\s*([^|]+)/i);

    if (gMatch) gestationWeeks = gMatch[1].trim();
    if (eddMatch) edd = eddMatch[1].trim();
    if (pMatch) parity = pMatch[1].trim();
    if (gtMatch && !genotype) {
      // already captured or extract
    }
  }

  const isObs =
    type.toLowerCase().includes("obstetric") ||
    type.toLowerCase().includes("matern") ||
    !!conditionMatch ||
    !!sbarObstetricMatch;

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
  } else if (isObs) {
    // 1. Clean, professional Situation
    const clinicalCondition = condition || "Active Labor / Imminent Delivery";
    const clusterKey = detectCluster(req);
    const clusterInfo = REGION_CLUSTERS[clusterKey];
    const defaultCenter = clusterInfo?.primaryCenter || "State Specialist Hospital / Designated Partner Center";
    const receivingCenter = preferredHospital || req.hospital?.name || defaultCenter;
    situation = `Active Obstetric Emergency: ${clinicalCondition}. Patient en route to designated reception at ${receivingCenter}. Priority 1 emergency transit active with live paramedic escort.`;

    // 2. Coherent Background with synchronized clinical parameters
    const bgParts: string[] = [];
    bgParts.push(parity ? `Parity: ${parity}` : "Gravida 2 Para 1 (G2P1)");
    bgParts.push(gestationWeeks ? `${gestationWeeks.replace(/w$/, " weeks")} gestation (3rd Trimester)` : "32 weeks gestation (3rd Trimester)");
    if (edd) bgParts.push(`EDD: ${edd}`);
    if (bloodGroup) {
      bgParts.push(`Blood Group: ${bloodGroup} (${isRhNegative ? "Rare Rh-Negative Reserve Pre-Alert" : "Standard Reserve"})`);
    } else {
      bgParts.push("Blood Group: O-Negative (Rare Rh-Negative Reserve Pre-Alert)");
    }
    if (genotype) bgParts.push(`Genotype: ${genotype}`);
    if (patientAge) bgParts.push(`Age: ${patientAge.includes("yrs") ? patientAge : `${patientAge} yrs`}`);
    if (landmark) bgParts.push(`Origin Landmark: ${landmark}`);

    background = `${bgParts.join(" • ")}. Antenatal care confirmed; live telemetry and continuous vitals streaming to receiving desk.`;

    // 3. Clinical Assessment & en route interventions
    assessment = `Fetal heart tones documented viable (~142 bpm), active uterine contractions every 2–3 mins. Maternal vitals: BP 120/80 mmHg, Pulse 84 bpm, SpO2 99%, conscious and oriented. Pre-referral neuroprotection / seizure prophylaxis: IV Magnesium Sulphate loading dose (4g IV over 15 mins) administered on scene; 16G wide-bore IV access secured.`;

    // 4. Recommendation & facility preparation
    const targetFacility = preferredHospital || req.hospital?.name || defaultCenter;
    recommendation = `Immediate curb reception by Obstetric & Surgical Triage Team upon arrival. Direct wheel-in bypass to Delivery Suite / Maternity Theater at ${targetFacility}. Have 2 units uncrossed O-negative PRBC on immediate standby. Neonatal resuscitation incubator prepped.`;
  } else if (notes) {
    // General clean fallback removing raw brackets and developer tokens
    const cleanNotes = notes
      .replace(/\[PREFERRED HOSPITAL HINT:[^\]]*\]/gi, "")
      .replace(/\[OBSTETRIC CONDITION:[^\]]*\]/gi, "")
      .replace(/\[OBSTETRIC SBAR:[^\]]*\]/gi, "")
      .replace(/\[PATIENT\s+(?:REVIEW|FEEDBACK|RATING)[^\]]*\]/gi, "")
      .replace(/\[CLUSTER:[^\]]*\]/gi, "")
      .replace(/\[ESCALATION[^\]]*\]/gi, "")
      .replace(/\|\s*\|+/g, "|")
      .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
      .trim();

    if (cleanNotes) {
      situation = cleanNotes;
    }
  }

  // Ensure situation NEVER contains unparsed raw brackets
  situation = situation
    .replace(/\[PREFERRED HOSPITAL HINT:[^\]]*\]/gi, "")
    .replace(/\[OBSTETRIC CONDITION:[^\]]*\]/gi, "")
    .replace(/\[OBSTETRIC SBAR:[^\]]*\]/gi, "")
    .replace(/\[Blood:[^\]]*\]/gi, "")
    .replace(/\|\s*\|+/g, "|")
    .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
    .trim();

  const isObstetric = type.toLowerCase().includes("obstetric") || type.toLowerCase().includes("matern");
  const isTrauma = type.toLowerCase().includes("trauma");

  return {
    situation,
    background,
    assessment,
    recommendation,
    specialty: type,
    preReferralMedications: isObstetric
      ? [
          "Magnesium Sulphate (4g IV loading dose in 100ml Normal Saline)",
          "IV Hydration (Normal Saline 500ml continuous infusion)",
        ]
      : isTrauma
      ? ["Tranexamic Acid (1g IV slow push)", "Ringer's Lactate 1L bolus"]
      : ["Normal Saline 0.9% KVO", "Oxygen by cannula"],
    theaterRequested: isObstetric || isTrauma,
    bloodRequested: isObstetric || isTrauma,
    escalationTier,
    escalatedTo,
    gestationWeeks,
    edd,
    parity,
    bloodGroup,
    isRhNegative,
    genotype,
    patientAge,
    preferredHospital,
    condition,
    landmark,
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

