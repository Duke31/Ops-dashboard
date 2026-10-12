export type RegionClusterId = 'all' | 'ibadan_private' | 'osun_pilot' | 'lagos_metro';

export interface RegionCluster {
  id: RegionClusterId;
  name: string;
  shortName: string;
  state: string;
  description: string;
  tagColor: string;
  center: { lat: number; lng: number };
  radiusKm: number;
  slaDispatchMinutes: number; // SLA tier 1 allocation window (3 mins)
  slaIntakeMinutes: number;   // SLA tier 2 hospital intake window (10 mins)
  tier1Description: string;
  tier2Description: string;
  tier3Fallback: {
    agency: string;
    hotline: string;
    instructions: string;
  };
}

export const REGION_CLUSTERS: Record<Exclude<RegionClusterId, 'all'>, RegionCluster> = {
  ibadan_private: {
    id: 'ibadan_private',
    name: 'Ibadan Private Hospital Network',
    shortName: 'Ibadan Private',
    state: 'Oyo State',
    description: 'Premier network of verified private clinics and secondary surgical facilities across Ibadan metropolitan area.',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    center: { lat: 7.3775, lng: 3.9470 },
    radiusKm: 35,
    slaDispatchMinutes: 3,
    slaIntakeMinutes: 10,
    tier1Description: 'Accredited private obstetric & surgical clinics (Ring Road, Bodija, Iwo Rd)',
    tier2Description: 'Tertiary referral complexes (University College Hospital - UCH Trauma)',
    tier3Fallback: {
      agency: 'Oyo State Emergency Medical Service / UCH Emergency Dispatch',
      hotline: '+2348006963674', // Oyo State / UCH Emergency desk
      instructions: '1-click telephone handover to UCH Resuscitation Bay & State Ambulance Line'
    }
  },
  osun_pilot: {
    id: 'osun_pilot',
    name: 'Osun State Government Pilot (OSEMSAS)',
    shortName: 'Osun Pilot (OSEMSAS)',
    state: 'Osun State',
    description: 'State-backed maternal-infant emergency response pilot integrating primary health centers and state referral hospitals.',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    center: { lat: 7.7827, lng: 4.5418 },
    radiusKm: 45,
    slaDispatchMinutes: 3,
    slaIntakeMinutes: 10,
    tier1Description: 'Designated Osogbo & Ede zonal primary healthcare units',
    tier2Description: 'Osun State University Teaching Hospital (UNIOSUNTH) & Asubiaro State Hospital',
    tier3Fallback: {
      agency: 'OSEMSAS State Command & Control Center',
      hotline: '+2348030006736', // OSEMSAS State Emergency Hotline
      instructions: 'Direct tie-in to Osun State Ministry of Health Emergency Operations Unit'
    }
  },
  lagos_metro: {
    id: 'lagos_metro',
    name: 'Lagos Metropolitan Fleet',
    shortName: 'Lagos Metro',
    state: 'Lagos State',
    description: 'Rapid urban intercept fleet coordinating high-density private surgical networks and tertiary apex centers.',
    tagColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    center: { lat: 6.5244, lng: 3.3792 },
    radiusKm: 50,
    slaDispatchMinutes: 3,
    slaIntakeMinutes: 10,
    tier1Description: 'Private trauma and maternal centers (Ikeja, Island, Lekki corridor)',
    tier2Description: 'Lagos State University Teaching Hospital (LASUTH) & LUTH Idi-Araba',
    tier3Fallback: {
      agency: 'Lagos State Emergency Management Agency (LASEMA 112/767)',
      hotline: '112',
      instructions: 'Escalation to Central LASEMA Dispatch & General Hospital Command'
    }
  }
};

/**
 * Calculates distance (in kilometers) between two coordinates using the Haversine formula.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Geo-classifies latitude and longitude coordinates into the closest matching regional cluster.
 */
export function classifyClusterByCoordinates(lat?: number | null, lng?: number | null): RegionClusterId {
  if (lat == null || lng == null) return 'ibadan_private';

  let closestCluster: RegionClusterId = 'ibadan_private';
  let minDistance = Infinity;

  const clusterList: RegionCluster[] = Object.values(REGION_CLUSTERS);
  for (const cluster of clusterList) {
    const dist = haversineDistanceKm(lat, lng, cluster.center.lat, cluster.center.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestCluster = cluster.id;
    }
  }

  return closestCluster;
}

/**
 * Extracts cluster ID from notes or address strings if explicitly tagged,
 * otherwise geo-classifies by coordinates.
 */
export function resolveItemCluster(item: {
  notes?: string | null;
  patient_lat?: number | null;
  patient_lng?: number | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): RegionClusterId {
  const rawText = `${item.notes || ''} ${item.address || ''}`.toLowerCase();
  if (rawText.includes('[cluster:osun') || rawText.includes('osun') || rawText.includes('osemsas') || rawText.includes('osogbo')) {
    return 'osun_pilot';
  }
  if (rawText.includes('[cluster:lagos') || rawText.includes('lagos') || rawText.includes('ikeja') || rawText.includes('lekki')) {
    return 'lagos_metro';
  }
  if (rawText.includes('[cluster:ibadan') || rawText.includes('ibadan') || rawText.includes('oyo')) {
    return 'ibadan_private';
  }

  const lat = item.patient_lat ?? item.lat;
  const lng = item.patient_lng ?? item.lng;
  return classifyClusterByCoordinates(lat, lng);
}

/**
 * Escalation tier status based on request elapsed times and SLA thresholds.
 */
export interface SLAEscalationStatus {
  tier: 1 | 2 | 3;
  tierLabel: string;
  isBreached: boolean;
  isApproachingBreach: boolean;
  minutesRemaining: number;
  progressPercent: number; // 0 to 100
  escalationTarget: string;
  fallbackAgency?: string;
  fallbackHotline?: string;
}

export function computeRequestSLA(
  createdAtStr: string,
  status: string,
  clusterId: RegionClusterId = 'ibadan_private'
): SLAEscalationStatus {
  const cluster = REGION_CLUSTERS[clusterId === 'all' ? 'ibadan_private' : clusterId] || REGION_CLUSTERS.ibadan_private;
  const createdTime = new Date(createdAtStr).getTime();
  const now = Date.now();
  const elapsedMinutes = Math.max(0, (now - createdTime) / 60000);

  // If already picked up or completed, SLA is fulfilled
  if (['picked_up', 'in_transit', 'completed', 'cancelled'].includes(status)) {
    return {
      tier: 1,
      tierLabel: 'SLA Met',
      isBreached: false,
      isApproachingBreach: false,
      minutesRemaining: 0,
      progressPercent: 100,
      escalationTarget: 'Fulfilled'
    };
  }

  // Phase 1: Dispatch allocation (status = pending or driver not yet en route)
  if (['pending', 'matching'].includes(status)) {
    const totalWindow = cluster.slaDispatchMinutes; // 3 mins
    const remaining = Math.max(0, totalWindow - elapsedMinutes);
    const progress = Math.min(100, (elapsedMinutes / totalWindow) * 100);

    if (elapsedMinutes > totalWindow * 2) {
      // Breached past Tier 2 into Tier 3
      return {
        tier: 3,
        tierLabel: 'Tier 3 (State Fallback)',
        isBreached: true,
        isApproachingBreach: true,
        minutesRemaining: 0,
        progressPercent: 100,
        escalationTarget: cluster.tier3Fallback.agency,
        fallbackAgency: cluster.tier3Fallback.agency,
        fallbackHotline: cluster.tier3Fallback.hotline
      };
    }

    if (elapsedMinutes > totalWindow) {
      // Breached into Tier 2 (Regional Referral Hub)
      return {
        tier: 2,
        tierLabel: 'Tier 2 (Referral Hub Escalation)',
        isBreached: true,
        isApproachingBreach: true,
        minutesRemaining: 0,
        progressPercent: 100,
        escalationTarget: cluster.tier2Description,
        fallbackAgency: cluster.tier3Fallback.agency,
        fallbackHotline: cluster.tier3Fallback.hotline
      };
    }

    return {
      tier: 1,
      tierLabel: 'Tier 1 (Dispatch Allocation)',
      isBreached: false,
      isApproachingBreach: remaining <= 1,
      minutesRemaining: Math.round(remaining * 10) / 10,
      progressPercent: Math.round(progress),
      escalationTarget: cluster.tier1Description
    };
  }

  // Phase 2: Hospital Intake acceptance window (status = accepted or en_route)
  const intakeWindow = cluster.slaIntakeMinutes; // 10 mins
  const remaining = Math.max(0, intakeWindow - elapsedMinutes);
  const progress = Math.min(100, (elapsedMinutes / intakeWindow) * 100);

  if (elapsedMinutes > intakeWindow) {
    return {
      tier: 2,
      tierLabel: 'Tier 2 Intake Warning',
      isBreached: true,
      isApproachingBreach: true,
      minutesRemaining: 0,
      progressPercent: 100,
      escalationTarget: cluster.tier2Description,
      fallbackAgency: cluster.tier3Fallback.agency,
      fallbackHotline: cluster.tier3Fallback.hotline
    };
  }

  return {
    tier: 1,
    tierLabel: 'Tier 1 (En Route to Intake)',
    isBreached: false,
    isApproachingBreach: remaining <= 2,
    minutesRemaining: Math.round(remaining * 10) / 10,
    progressPercent: Math.round(progress),
    escalationTarget: cluster.tier1Description
  };
}
