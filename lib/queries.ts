import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmergencyRequest, TransitionRule } from "./types";

const FULL_REQUEST_SELECT = [
  "id",
  "patient_address",
  "origin",
  "patient_lat",
  "patient_lng",
  "emergency_type",
  "status",
  "created_at",
  "hospital_id",
  "driver_id",
  "notes",
  "contact_phone",
  "patient_age_band",
  "completed_at",
  "priority",
  "tactical_alert",
  "tactical_alert_code",
  "tactical_alert_at",
  "tactical_alert_ack",
  "dispatcher_response",
  "dispatcher_response_at",
  "hospital:hospitals(id, name, address, available_capacity)",
  "driver:drivers(id, display_name, vehicle_label, hospital_id, active)",
].join(", ");

const SAFE_REQUEST_SELECT = [
  "id",
  "patient_address",
  "origin",
  "patient_lat",
  "patient_lng",
  "emergency_type",
  "status",
  "created_at",
  "hospital_id",
  "driver_id",
  "notes",
  "contact_phone",
  "patient_age_band",
  "completed_at",
  "priority",
  "hospital:hospitals(id, name, address, available_capacity)",
  "driver:drivers(id, display_name, vehicle_label, hospital_id, active)",
].join(", ");

const MINIMAL_REQUEST_SELECT = [
  "id",
  "patient_address",
  "origin",
  "patient_lat",
  "patient_lng",
  "emergency_type",
  "status",
  "created_at",
  "hospital_id",
  "driver_id",
  "notes",
  "contact_phone",
  "patient_age_band",
  "completed_at",
  "priority",
].join(", ");

export async function fetchRequests(
  supabase: SupabaseClient,
  opts?: { hospitalId?: string; activeOnly?: boolean },
): Promise<EmergencyRequest[]> {
  try {
    let q = supabase
      .from("emergency_requests")
      .select(FULL_REQUEST_SELECT)
      .order("created_at", { ascending: false });

    if (opts?.hospitalId) q = q.eq("hospital_id", opts.hospitalId);
    if (opts?.activeOnly !== false) {
      q = q.not("status", "in", '("Completed","Cancelled / failed")');
    }

    const { data, error } = await q;
    if (!error && data) return data as unknown as EmergencyRequest[];

    // Second attempt: standard schema without tactical columns
    let safeQ = supabase
      .from("emergency_requests")
      .select(SAFE_REQUEST_SELECT)
      .order("created_at", { ascending: false });

    if (opts?.hospitalId) safeQ = safeQ.eq("hospital_id", opts.hospitalId);
    if (opts?.activeOnly !== false) {
      safeQ = safeQ.not("status", "in", '("Completed","Cancelled / failed")');
    }

    const safeRes = await safeQ;
    if (!safeRes.error && safeRes.data) return safeRes.data as unknown as EmergencyRequest[];

    // Third attempt: minimal columns without foreign joins
    let minQ = supabase
      .from("emergency_requests")
      .select(MINIMAL_REQUEST_SELECT)
      .order("created_at", { ascending: false });

    if (opts?.hospitalId) minQ = minQ.eq("hospital_id", opts.hospitalId);
    if (opts?.activeOnly !== false) {
      minQ = minQ.not("status", "in", '("Completed","Cancelled / failed")');
    }

    const minRes = await minQ;
    if (!minRes.error && minRes.data) return minRes.data as unknown as EmergencyRequest[];

    return [];
  } catch (err) {
    console.error("fetchRequests fallback catch:", err);
    return [];
  }
}

export async function fetchTransitionRules(
  supabase: SupabaseClient,
  actorRole: string,
): Promise<TransitionRule[]> {
  try {
    const { data, error } = await supabase
      .from("emergency_transition_rules")
      .select("from_status, to_status, actor_role")
      .eq("actor_role", actorRole);
    if (error) {
      console.warn(`fetchTransitionRules notice for ${actorRole}:`, error.message);
      return [];
    }
    return (data ?? []) as TransitionRule[];
  } catch (err) {
    console.error(`fetchTransitionRules catch for ${actorRole}:`, err);
    return [];
  }
}


export function allowedTargets(
  rules: TransitionRule[],
  fromStatus: string,
  actorRole: string,
) {
  const targets = rules
    .filter((r) => {
      if (r.from_status !== fromStatus) return false;
      if (r.actor_role === actorRole) return true;
      return actorRole === "admin" && r.actor_role === "dispatcher";
    })
    .map((r) => r.to_status);
  return [...new Set(targets)];
}

export function formatLocation(r: EmergencyRequest): string {
  if (r.patient_address) return r.patient_address;
  if (r.origin) return r.origin;
  if (r.patient_lat != null && r.patient_lng != null) {
    return `${r.patient_lat.toFixed(5)}, ${r.patient_lng.toFixed(5)}`;
  }
  return "—";
}

export function resolvePatientAgeBand(
  r: { patient_age_band?: string | null; notes?: string | null },
): string | null {
  const col = r.patient_age_band?.trim();
  if (col && col.length > 0 && col.toLowerCase() !== "unknown") return col;
  if (col && col.toLowerCase() === "unknown") return "unknown";
  const notes = r.notes ?? "";
  const m = notes.match(/Age\s*band:\s*([0-9+\-]+)/i);
  if (m?.[1]) return m[1];
  return col || null;
}

