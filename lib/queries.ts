import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmergencyRequest, TransitionRule } from "./types";

const REQUEST_SELECT = [
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
  "completed_at",
  "priority",
  "hospital:hospitals(id, name, address, available_capacity)",
  "driver:drivers(id, display_name, vehicle_label, hospital_id, status)",
].join(", ");

export async function fetchRequests(
  supabase: SupabaseClient,
  opts?: { hospitalId?: string; activeOnly?: boolean },
) {
  let q = supabase
    .from("emergency_requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false });

  if (opts?.hospitalId) q = q.eq("hospital_id", opts.hospitalId);
  if (opts?.activeOnly !== false) {
    q = q.not("status", "in", '("Completed","Cancelled / failed")');
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as EmergencyRequest[];
}

export async function fetchTransitionRules(
  supabase: SupabaseClient,
  actorRole: string,
) {
  const { data, error } = await supabase
    .from("emergency_transition_rules")
    .select("from_status, to_status, actor_role")
    .eq("actor_role", actorRole);
  if (error) throw error;
  return (data ?? []) as TransitionRule[];
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
