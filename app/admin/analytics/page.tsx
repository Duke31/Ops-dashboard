import { AppShell } from "@/components/AppShell";
import { AnalyticsClient } from "@/components/AnalyticsClient";
import { requireProfile } from "@/lib/auth";
import { fetchRequests } from "@/lib/queries";
import type { Hospital, Driver } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage() {
  const { supabase, profile } = await requireProfile("admin");

  // Fetch full dataset for analytics safely
  const [requests, hospitalsRes, driversRes] = await Promise.all([
    fetchRequests(supabase, { activeOnly: false }),
    supabase
      .from("hospitals")
      .select("id, name, address, available_capacity, intake_phone")
      .order("name"),
    supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active, current_lat, current_lng")
      .order("display_name"),
  ]);

  const hospitals = (hospitalsRes.data ?? []) as Hospital[];
  const drivers = (driversRes.data ?? []) as Driver[];

  return (
    <AppShell profile={profile}>
      <AnalyticsClient
        requests={requests}
        hospitals={hospitals}
        drivers={drivers}
      />
    </AppShell>
  );
}
