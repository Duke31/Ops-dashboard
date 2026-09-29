import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmergencyRequest, TransitionRule } from "./types";

const REQUEST_SELECT_FULL = [
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
  "hospital:hospitals(id, name, address, available_capacity, intake_phone, lat, lng)",
  "driver:drivers(id, display_name, vehicle_label, hospital_id, active, battery_level, is_charging, network_type, last_location_at)",
].join(", ");

const REQUEST_SELECT_BASE = [
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

const REQUEST_SELECT_PLAIN = [
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

export function formatSupabaseError(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error && e.message) return e.message;
  const o = e as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  const parts = [o.message, o.code && `code=${o.code}`, o.details, o.hint]
    .filter(Boolean)
    .map(String);
  return parts.length ? parts.join(" | ") : JSON.stringify(e);
}

function applyRequestFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  opts?: {
    hospitalId?: string;
    driverId?: string;
    activeOnly?: boolean;
    completedOnly?: boolean;
    limit?: number;
  },
) {
  if (opts?.hospitalId) q = q.eq("hospital_id", opts.hospitalId);
  if (opts?.driverId) q = q.eq("driver_id", opts.driverId);
  if (opts?.completedOnly) {
    q = q.eq("status", "Completed");
  } else if (opts?.activeOnly !== false) {
    // Prefer neq chain over "in" string which can break on enum types
    q = q
      .neq("status", "Completed")
      .neq("status", "Cancelled / failed");
  }
  if (opts?.limit) q = q.limit(opts.limit);
  return q;
}

async function runRequestSelect(
  supabase: SupabaseClient,
  select: string,
  opts?: {
    hospitalId?: string;
    driverId?: string;
    activeOnly?: boolean;
    completedOnly?: boolean;
    limit?: number;
  },
) {
  const q = applyRequestFilters(
    supabase
      .from("emergency_requests")
      .select(select)
      .order("created_at", { ascending: false }),
    opts,
  );
  return q;
}

export async function fetchRequests(
  supabase: SupabaseClient,
  opts?: {
    hospitalId?: string;
    driverId?: string;
    activeOnly?: boolean;
    completedOnly?: boolean;
    limit?: number;
  },
) {
  const attempts = [
    REQUEST_SELECT_FULL,
    REQUEST_SELECT_BASE,
    REQUEST_SELECT_PLAIN,
  ];

  let lastError: unknown = null;

  for (const select of attempts) {
    const { data, error } = await runRequestSelect(supabase, select, opts);
    if (!error) {
      return (data ?? []) as unknown as EmergencyRequest[];
    }
    lastError = error;
    const msg = formatSupabaseError(error);
    // Retry on schema/embed issues; stop early on clear RLS denial only after plain select
    const retryable =
      /column|does not exist|schema cache|relationship|embed|foreign key/i.test(
        msg,
      );
    if (!retryable && select === REQUEST_SELECT_PLAIN) break;
    if (!retryable && select !== REQUEST_SELECT_FULL) {
      // non-schema error on base/plain — still try plain once
      continue;
    }
  }

  throw new Error(
    `emergency_requests SELECT failed: ${formatSupabaseError(lastError)}`,
  );
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
