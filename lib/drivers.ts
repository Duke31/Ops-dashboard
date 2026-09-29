import type { SupabaseClient } from "@supabase/supabase-js";
import type { Driver } from "./types";

const FULL_SELECT =
  "id, display_name, vehicle_label, hospital_id, active, battery_level, is_charging, network_type, last_location_at, current_lat, current_lng";

const BASE_SELECT =
  "id, display_name, vehicle_label, hospital_id, active, last_location_at";

/**
 * Load all drivers for assignment (active + standby).
 * Tries full telemetry columns first; falls back if migration not applied.
 * Surfaces RLS/schema errors — never hides them as an empty dropdown.
 */
export async function fetchDriversForDesk(supabase: SupabaseClient): Promise<{
  drivers: Driver[];
  error: string | null;
}> {
  const full = await supabase
    .from("drivers")
    .select(FULL_SELECT)
    .order("display_name");

  if (!full.error) {
    return { drivers: (full.data ?? []) as Driver[], error: null };
  }

  // Column missing (telemetry SQL not run) — retry base columns
  const msg = full.error.message || String(full.error);
  const looksMissingCol =
    /column|does not exist|schema cache/i.test(msg);

  if (looksMissingCol) {
    const base = await supabase
      .from("drivers")
      .select(BASE_SELECT)
      .order("display_name");
    if (base.error) {
      return {
        drivers: [],
        error: `drivers SELECT failed: ${base.error.message}`,
      };
    }
    return {
      drivers: (base.data ?? []) as Driver[],
      error: null,
    };
  }

  // RLS or other — show exact error, do not widen policies
  return {
    drivers: [],
    error: `drivers SELECT failed: ${msg}`,
  };
}
